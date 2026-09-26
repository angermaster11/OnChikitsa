import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/validators';

/** Admin list query: pagination + active filter + free-text search. */
export const listFaqsQuerySchema = paginationQuerySchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().min(1).max(300).optional(),
});

/** Create payload for a new FAQ (admin only). */
export const createFaqSchema = z
  .object({
    question: z.string().trim().min(1).max(300),
    answer: z.string().trim().min(1).max(5000),
    order: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

/** Editable fields on an FAQ. All optional so a PATCH can touch a single field. */
export const updateFaqSchema = z
  .object({
    question: z.string().trim().min(1).max(300).optional(),
    answer: z.string().trim().min(1).max(5000).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type ListFaqsQuery = z.infer<typeof listFaqsQuerySchema>;
export type CreateFaqBody = z.infer<typeof createFaqSchema>;
export type UpdateFaqBody = z.infer<typeof updateFaqSchema>;
