import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError, ERROR_CODES } from '../utils/errors';
import { sendError } from '../utils/response';
import { env } from '../config/env';
import { logger } from '../config/logger';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`);
}

/**
 * Centralised error handler. Operational AppErrors are surfaced with their
 * code/message; everything else is logged and returned as a generic 500 so we
 * never leak stack traces or internal DB errors to clients.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed', err.flatten());
    return;
  }

  // Duplicate-key errors from Mongo → 409 with a safe message.
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    sendError(res, 409, ERROR_CODES.CONFLICT, 'A record with these details already exists');
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Database validation failed');
    return;
  }

  // Unknown / programmer error: log the full detail server-side, return generic.
  logger.error({ err }, 'Unhandled error');
  const message = env.isProd ? 'Something went wrong' : (err as Error)?.message ?? 'Internal error';
  sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, message);
}
