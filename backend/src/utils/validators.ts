import { Types } from 'mongoose';
import { z } from 'zod';
import { PAGINATION } from './constants';

/** A Mongo ObjectId string. */
export const objectIdSchema = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

/** `{ id }` route params. */
export const idParamSchema = z.object({ id: objectIdSchema });

/** Shared pagination query — coerces strings from the querystring to numbers. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
});

/** Optional ISO date-range filters. */
export const dateRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** E.164-ish phone: optional leading +, 7–15 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number');
