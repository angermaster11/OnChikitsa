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
    autoIndex: !env.isProd, // build indexes automatically outside production
  });

  connected = true;
  logger.info('MongoDB connected');
  return mongoose;
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
