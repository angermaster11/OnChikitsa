import { z } from 'zod';

/** Which clinic asset the signed upload is for — used to namespace the folder. */
export const uploadSignatureSchema = z
  .object({
    kind: z.enum(['logo', 'banner', 'doctor', 'ticket']).default('logo'),
  })
  .strict();

export type UploadSignatureBody = z.infer<typeof uploadSignatureSchema>;
