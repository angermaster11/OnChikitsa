import pino from 'pino';
import { env } from './env';

/**
 * Application logger (Pino). This is the APPLICATION log stream — errors,
 * warnings, DB/Firebase failures, performance — and is deliberately separate
 * from the audit log (who did what), which lives in MongoDB.
 *
 * `redact` guarantees we never emit secrets even if they end up on a logged
 * object by accident.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      '*.refreshToken',
      'FIREBASE_PRIVATE_KEY',
      'privateKey',
    ],
    censor: '[redacted]',
  },
  transport: env.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});

export type Logger = typeof logger;
