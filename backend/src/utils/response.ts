import type { Response } from 'express';
import type { ErrorCode } from './errors';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Standard success envelope: { success, data, message }. */
export function sendSuccess<T>(res: Response, data: T, message = 'Operation successful', statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data, message });
}

/** Standard paginated envelope: { success, data[], pagination }. */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, data, pagination });
}

/** Standard error envelope: { success:false, error:{ code, message, details? } }. */
export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): Response {
  const error: { code: ErrorCode; message: string; details?: unknown } = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(statusCode).json({ success: false, error });
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
