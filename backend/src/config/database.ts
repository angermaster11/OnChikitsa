import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

mongoose.set('strictQuery', true);

let connected = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (connected) return mongoose;

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  await mongoose.connect(env.MONGODB_URI, {
    // Force this app onto its own database, isolated from anything else on the
    // same cluster. This wins over a db name in the URI path, so pasting a
    // fresh Atlas URI (which has none) can't accidentally leak data elsewhere.
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    autoIndex: !env.isProd, // build indexes automatically outside production
  });

  connected = true;
  logger.info('MongoDB connected');

  // Best-effort: heal a legacy index shape that blocks bookings. Never fatal.
  try {
    await reconcilePaymentIndexes();
  } catch (err) {
    logger.error({ err }, 'Payment index reconciliation failed');
  }

  // In production `autoIndex` is off, so declared indexes are not built on their
  // own. Create them explicitly here (non-destructive — never drops an index).
  // Outside production `autoIndex` already handles this, so we skip it.
  if (env.isProd) {
    await buildIndexes();
  }

  return mongoose;
}

/**
 * Create every model's declared indexes on boot. Needed in production where
 * `autoIndex` is off: without this, a fresh prod DB has none of the ~45 declared
 * indexes (or the unique constraints on firebaseUid / appointmentCode / admin
 * email), so every hot query becomes a collection scan and uniqueness is not
 * enforced. Uses `createIndexes()` (additive — only builds what is missing, never
 * drops), so it is safe to run on every boot and idempotent once built. Per-model
 * try/catch keeps one bad model from blocking the rest and never fails startup.
 */
async function buildIndexes(): Promise<void> {
  // Importing the barrel registers all models on the connection.
  await import('../models');
  const models = Object.values(mongoose.models);
  let built = 0;
  for (const m of models) {
    try {
      await m.createIndexes();
      built += 1;
    } catch (err) {
      logger.error({ err, model: m.modelName }, 'Index build failed for model');
    }
  }
  logger.info({ models: built }, 'Index build complete');
}

/**
 * Self-heal a legacy payment index shape. An earlier build created a NON-partial
 * unique index on the order-id field (default name `<field>_1`), but a booking that
 * never reaches checkout leaves that field null — so the second such row collides on
 * null → E11000 "A record with these details already exists", and it fires regardless
 * of date/slot (which is why booking failed even on different days). Mongoose never
 * drops an index whose name already exists, so it cannot replace the stale one on its
 * own. Here we (1) drop any stale NON-partial unique index on `razorpayOrderId`,
 * (2) drop any leftover index on the legacy `payuTxnId` field (that field no longer
 * exists), and (3) (re)create the intended partial-unique index on `razorpayOrderId`
 * — the one that only indexes rows actually carrying a string id, so nulls never
 * clash. Idempotent: once the first boot fixes it, every later boot is a no-op.
 */
async function reconcilePaymentIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  // The transactions live in the `transactions` collection (see payment.model.ts).
  const col = db.collection('transactions');

  let existing: Array<{ name?: string; key?: Record<string, unknown>; unique?: boolean; partialFilterExpression?: unknown }>;
  try {
    existing = await col.indexes();
  } catch {
    return; // collection not created yet on a fresh DB — autoIndex builds it correctly
  }

  const isSingleField = (field: string, i: { key?: Record<string, unknown> }): boolean =>
    Boolean(i.key && Object.keys(i.key).length === 1 && i.key[field] === 1);

  // (1) The null-collision bug: a unique-but-NOT-partial index on razorpayOrderId.
  const staleOrderIdx = existing.find(
    (i) => i.unique === true && !i.partialFilterExpression && isSingleField('razorpayOrderId', i),
  );
  if (staleOrderIdx?.name) {
    await col.dropIndex(staleOrderIdx.name).catch(() => undefined);
    logger.warn({ index: staleOrderIdx.name }, 'Dropped stale non-partial unique razorpayOrderId index');
  }

  // (2) Legacy `payuTxnId` field is gone — remove its index if a pre-migration DB has one.
  const legacyPayuIdx = existing.find((i) => isSingleField('payuTxnId', i));
  if (legacyPayuIdx?.name) {
    await col.dropIndex(legacyPayuIdx.name).catch(() => undefined);
    logger.warn({ index: legacyPayuIdx.name }, 'Dropped legacy payuTxnId index');
  }

  // (3) Ensure the intended partial-unique index exists (also covers production, where
  //     autoIndex is off). No-op if it is already present.
  await col.createIndex(
    { razorpayOrderId: 1 },
    { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } },
  );
}

export async function disconnectDatabase(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  logger.info('MongoDB disconnected (graceful shutdown)');
}

/**
 * Whether the connected MongoDB deployment supports multi-document transactions
 * (i.e. it is a replica set / mongos). A standalone `mongod` does not, so we can
 * degrade gracefully in `runInTransaction`.
 */
export function supportsTransactions(): boolean {
  // topology info is not part of the public typings; read defensively.
  const client = mongoose.connection.getClient();
  const topology = (client as unknown as { topology?: { description?: { type?: string } } }).topology;
  const type = topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
}
