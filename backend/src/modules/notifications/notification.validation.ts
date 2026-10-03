import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from '../../utils/validators';

/** Register this device's FCM token (push). Called by the app on launch after
 *  permission is granted; upserted by token so re-sends are idempotent. */
export const registerDeviceSchema = z
  .object({
    token: z.string().trim().min(10).max(4096),
    platform: z.enum(['android', 'ios', 'web']).optional(),
  })
  .strict();

export const unregisterDeviceSchema = z
  .object({ token: z.string().trim().min(10).max(4096) })
  .strict();

/** Patient notification feed query (pagination only). */
export const listNotificationsQuerySchema = paginationQuerySchema;

/** Admin broadcast compose. clinicId is required only for CLINIC_PATIENTS. */
export const broadcastSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(1000),
    audienceType: z.enum(['ALL_PATIENTS', 'CLINIC_PATIENTS', 'ALL_CLINICS']),
    clinicId: objectIdSchema.optional(),
  })
  .strict()
  .refine((b) => b.audienceType !== 'CLINIC_PATIENTS' || Boolean(b.clinicId), {
    message: 'clinicId is required when targeting a clinic’s patients',
    path: ['clinicId'],
  });

export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceBody = z.infer<typeof unregisterDeviceSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type BroadcastBody = z.infer<typeof broadcastSchema>;

