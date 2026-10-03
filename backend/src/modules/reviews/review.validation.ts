import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/validators';

/** Submit (or update) a review for a completed appointment. */
export const submitReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

/** Paginated reviews list query (clinic + admin + public clinic view). */
export const listReviewsQuerySchema = paginationQuerySchema;

export type SubmitReviewBody = z.infer<typeof submitReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
