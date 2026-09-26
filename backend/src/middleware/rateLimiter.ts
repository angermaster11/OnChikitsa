import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../utils/errors';
import { sendError } from '../utils/response';

const rateLimitHandler = (_req: unknown, res: Parameters<typeof sendError>[0]) =>
  sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many requests, please try again later');

/**
 * Global API limiter — a coarse ceiling to blunt abuse/scraping. For a
 * multi-instance deployment swap the default in-memory store for a Redis store.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
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
});
