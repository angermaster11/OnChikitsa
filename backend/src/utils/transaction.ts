import mongoose, { ClientSession } from 'mongoose';
import { supportsTransactions } from '../config/database';
import { logger } from '../config/logger';

/**
 * Run `work` inside a MongoDB transaction when the deployment supports it
 * (replica set / sharded cluster). On a standalone `mongod` — common in local
 * dev — transactions are unavailable, so we execute `work` without a session.
 *
 * Callers MUST thread the provided `session` (possibly null) into every write
 * so that, where transactions exist, all writes commit or roll back together.
 * This is what guarantees "user banned" and "audit log written" stay atomic.
 */
export async function runInTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  if (!supportsTransactions()) {
    // Standalone: no transaction guarantees available. Execute sequentially and
    // rely on careful write ordering in the service layer.
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    logger.error({ err }, 'Transaction aborted');
    throw err;
  } finally {
    await session.endSession();
  }
}
