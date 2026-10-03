import { z } from 'zod';

export const updateLegalSchema = z
  .object({
    privacyPolicy: z.string().optional(),
    termsAndConditions: z.string().optional(),
  })
  .strict();

export type UpdateLegalBody = z.infer<typeof updateLegalSchema>;
