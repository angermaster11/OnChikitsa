import { PAGINATION } from './constants';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Normalise raw page/limit values (already coerced to numbers by Zod) into safe
 * bounds and a mongo `skip`. Guards against negative pages and enforces MAX_LIMIT
 * so a client cannot ask for an unbounded result set.
 */
export function resolvePagination(rawPage?: number, rawLimit?: number): PaginationParams {
  const page = Math.max(1, Math.trunc(rawPage ?? PAGINATION.DEFAULT_PAGE));
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Math.trunc(rawLimit ?? PAGINATION.DEFAULT_LIMIT)),
  );
  return { page, limit, skip: (page - 1) * limit };
}
