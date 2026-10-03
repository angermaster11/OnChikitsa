import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

/**
 * Builds the Express application. Kept free of side effects (no listen / no DB
 * connect) so it can be imported directly by integration tests with supertest.
 */
export function createApp(): Application {
  const app = express();

  // Behind a reverse proxy / tunnel — trust the configured number of hops so
  // req.ip and the rate-limiter key reflect the real client, not the proxy. The
  // hop count is env-driven (TRUST_PROXY) so production can set it exactly and a
  // client can't spoof X-Forwarded-For to defeat the limiter.
  app.set('trust proxy', env.trustProxy);

  // ── Security & parsing ──────────────────────────────────────────────────
  app.use(helmet());
  // CORS: when origins are wildcard we must NOT also reflect credentials (that
  // combination lets any site make credentialed cross-origin calls). The apps use
  // bearer tokens, not cookies, so credentials are only enabled for an explicit
  // allow-list of origins.
  const corsWildcard = env.corsOrigins.includes('*');
  app.use(
    cors({
      origin: corsWildcard ? '*' : env.corsOrigins,
      credentials: !corsWildcard,
    }),
  );
  // The Razorpay webhook is verified by an HMAC over the EXACT raw request bytes, so
  // it must NOT be JSON-parsed. Capture it as a Buffer on its own path BEFORE the
  // global JSON parser (Express matches this narrower mount first, and its `_body`
  // flag makes the JSON/urlencoded parsers skip an already-read body).
  app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: '*/*', limit: env.BODY_LIMIT }));
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));
  app.use(requestLogger);

  // ── Health / liveness (unauthenticated, must stay at /health) ───────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: { status: 'ok', service: 'onchikitsa-backend', uptime: process.uptime() },
      message: 'Healthy',
    });
  });
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, data: { service: 'onchikitsa-backend' }, message: 'OnChikitsa API' });
  });

  // ── Versioned API. Global limiter guards everything under /api. ─────────
  app.use('/api', apiRateLimiter);
  app.use('/api/v1', apiRouter);

  // ── 404 + centralised error handling (must be registered last). ─────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
