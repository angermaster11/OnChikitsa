import rateLimit, { type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ERROR_CODES } from '../utils/errors';
import { sendError } from '../utils/response';
import { getRedis } from '../config/redis';
import { logger } from '../config/logger';

const rateLimitHandler = (_req: unknown, res: Parameters<typeof sendError>[0]) =>
  sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many requests, please try again later');

/** Minimal shape of a Redis reply the limiter's Lua commands return. */
type RedisReply = string | number | (string | number)[];

/**
 * Build a shared Redis-backed store when REDIS_URL is configured, so the limit is
 * enforced correctly across every instance behind a load balancer. Returns
 * undefined otherwise — express-rate-limit then uses its default in-process
 * MemoryStore (the single-instance / local-dev behaviour, unchanged).
 */
function sharedStore(prefix: string): Store | undefined {
  const client = getRedis();
  if (!client) return undefined;
  logger.info({ prefix }, 'Rate limiter using shared Redis store');
  return new RedisStore({
    prefix,
    // ioredis `call` takes (command, ...args); cast to a plain string-rest fn so the
    // limiter's variadic sendCommand lines up without a tuple-type complaint.
    sendCommand: (...args: string[]) =>
      (client.call as (...a: string[]) => Promise<RedisReply>)(...args),
  });
}

/**
 * Global API limiter — a coarse ceiling to blunt abuse/scraping. Backed by Redis
 * across instances when REDIS_URL is set, else in-process.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  store: sharedStore('rl:api:'),
});

/**
 * Strict limiter for admin login — a first line of defence against credential
 * stuffing (per-account lockout in the service layer is the second). Keyed by IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  store: sharedStore('rl:login:'),
});
