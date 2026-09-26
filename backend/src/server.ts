import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

/**
 * Process entry point: connect the database, start the HTTP server, and install
 * graceful-shutdown + last-resort crash handlers.
 */
async function start(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`OnChikitsa backend listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    if (!env.firebaseConfigured) {
      logger.warn('Firebase is not configured — USER/CLINIC app endpoints will reject requests.');
    }
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully…');

    server.close(() => {
      void disconnectDatabase()
        .catch((err) => logger.error({ err }, 'Error during DB disconnect'))
        .finally(() => {
          logger.info('Shutdown complete.');
          process.exit(0);
        });
    });

    // Force-exit if connections refuse to drain in time.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
