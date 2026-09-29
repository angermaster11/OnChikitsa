import { z } from 'zod';
import { objectIdSchema } from '../../utils/validators';

/** `{ clinicId }` route params for the wallet drill-in / settle-all endpoints. */
export const clinicIdParamSchema = z.object({ clinicId: objectIdSchema });

/** Optional note when settling (single transaction or a whole clinic). */
export const settleBodySchema = z
  .object({ note: z.string().trim().max(500).optional() })
  .strict();

export type SettleBody = z.infer<typeof settleBodySchema>;
