import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { appointmentRepository } from './modules/appointments/appointment.repository';

/** How often the background job flips lapsed PENDING_PAYMENT holds to CANCELLED. */
const HOLD_SWEEP_INTERVAL_MS = 60_000;

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

  // Housekeeping: periodically flip lapsed PENDING_PAYMENT holds to CANCELLED so
  // abandoned checkouts don't linger as pending rows. Seats are already freed the
  // moment a hold expires (occupancy filters on holdExpiresAt), so this is purely
  // for tidy listings — it used to run on every availability/list read. `.unref()`
  // so it never keeps the process alive on its own.
  const holdSweep = setInterval(() => {
    void appointmentRepository
      .expireHolds()
      .then((n) => {
        if (n > 0) logger.info({ expired: n }, 'Swept lapsed payment holds');
      })
      .catch((err) => logger.error({ err }, 'Hold sweep failed'));
  }, HOLD_SWEEP_INTERVAL_MS);
  holdSweep.unref();

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully…');
    clearInterval(holdSweep);

    server.close(() => {
      void Promise.allSettled([disconnectDatabase(), disconnectRedis()])
        .catch((err) => logger.error({ err }, 'Error during shutdown disconnect'))
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
