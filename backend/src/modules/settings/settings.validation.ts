import { z } from 'zod';
import { GST_BASE } from '../../utils/constants';

/**
 * Editable pricing settings. All fields optional so a PATCH can touch just one.
 * `.strict()` rejects unknown keys (e.g. an attempt to set `key` or `currency`
 * to something unsupported). Amounts are integer paise; percentages are 0–100.
 */
export const updatePricingSettingsSchema = z
  .object({
    platformFeePaise: z.number().int().min(0).max(10_000_000).optional(),
    gstRate: z.number().min(0).max(100).optional(),
    defaultCommissionPercent: z.number().min(0).max(100).optional(),
    gstBase: z.enum([GST_BASE.PLATFORM_REVENUE, GST_BASE.PLATFORM_FEE]).optional(),
  })
  .strict();

export type UpdatePricingSettingsBody = z.infer<typeof updatePricingSettingsSchema>;
