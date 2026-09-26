import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

/**
 * HTTP request logging (application log stream). Attaches a request id, and
 * downgrades expected 4xx responses to `warn`/`info` so genuine 5xx errors
 * stand out. Auth headers are already redacted by the base logger config.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', existing);
    return existing;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/',
  },
});
