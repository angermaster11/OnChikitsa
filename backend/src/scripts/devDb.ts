/**
 * Local development MongoDB.
 *
 * Why this exists: the system-installed MongoDB 8 refuses to start on this
 * host's Linux kernel (kernels >= 6.19 are blocked by that build — see MongoDB
 * SERVER-121912). This script boots a self-contained mongod via
 * `mongodb-memory-server` (which ships a kernel-compatible binary) on a FIXED
 * port with a PERSISTENT data directory, so `npm run dev` can connect to the
 * standard `mongodb://127.0.0.1:27017/onchikitsa` and your data survives
 * restarts.
 *
 * Usage — run it in its own terminal and leave it running:
 *   npm run dev:db          # then, in another terminal: npm run dev
 * Ctrl+C stops it cleanly.
 *
 * This is a DEV convenience ONLY. It is standalone (no replica set), so the
 * app's transaction paths take their documented graceful-fallback route. In
 * production point MONGODB_URI at a real MongoDB replica set (see
 * docs/DEPLOYMENT.md); for full transaction fidelity in dev, use MongoDB Atlas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = Number(process.env.DEV_DB_PORT ?? 27017);
const DB_PATH = path.resolve(__dirname, '../../.dev-db');

async function main(): Promise<void> {
  fs.mkdirSync(DB_PATH, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: { port: PORT, dbPath: DB_PATH, storageEngine: 'wiredTiger' },
  });

  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      '  Local dev MongoDB is running.',
      `  URI      : mongodb://127.0.0.1:${PORT}/onchikitsa`,
      `  Data dir : ${DB_PATH}  (persists across restarts)`,
      '',
      '  Leave this running, then in another terminal:  npm run dev',
      '  Press Ctrl+C to stop.',
      '',
    ].join('\n'),
  );

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\nReceived ${signal} — stopping dev MongoDB…`);
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start dev MongoDB:', err);
  process.exit(1);
});
