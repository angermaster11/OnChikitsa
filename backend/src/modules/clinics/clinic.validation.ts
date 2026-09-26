import { z } from 'zod';
import { CLINIC_STATUS } from '../../utils/constants';
import { paginationQuerySchema, dateRangeQuerySchema, phoneSchema } from '../../utils/validators';

/** Admin list query: pagination + search + filters. */
export const listClinicsQuerySchema = paginationQuerySchema.merge(dateRangeQuerySchema).extend({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(CLINIC_STATUS).optional(),
});

/** Postal address — every part optional so a clinic can save partial info. */
export const clinicAddressSchema = z
  .object({
    line: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    pincode: z.string().trim().max(20).optional(),
    formatted: z.string().trim().max(500).optional(),
  })
  .strict();

/** GPS coordinates from "Use current location". */
export const clinicLocationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional(),
  })
  .strict();

/** Free-text specialty tags. */
export const specialtiesSchema = z.array(z.string().trim().min(1).max(80)).max(30);

/** Fields an admin may edit on a clinic. BANNED/DELETED are NOT settable here —
 *  those flow through the dedicated ban/unban/delete endpoints so they are always
 *  audited. Only the operational statuses may be flipped through a normal update. */
export const adminUpdateClinicSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone1: phoneSchema.optional(),
    phone2: phoneSchema.optional(),
    email: z.string().email().optional(),
    yearsOld: z.number().min(0).optional(),
    banner: z.string().optional(),
    logo: z.string().optional(),
    description: z.string().optional(),
    specification: z.string().optional(),
    specialties: specialtiesSchema.optional(),
    address: clinicAddressSchema.optional(),
    location: clinicLocationSchema.nullable().optional(),
    consultationFee: z.number().min(0).optional(),
    averageConsultationTime: z.number().min(0).optional(),
    status: z
      .enum([CLINIC_STATUS.ACTIVE, CLINIC_STATUS.CLOSED, CLINIC_STATUS.BOOKING_FULL])
      .optional(),
  })
  .strict();

export const banSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

/** Self-registration payload for the Clinic app (identity comes from the token). */
export const registerClinicSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone1: phoneSchema,
    phone2: phoneSchema.optional(),
    email: z.string().email().optional(),
    yearsOld: z.number().min(0).optional(),
    description: z.string().optional(),
    specification: z.string().optional(),
    specialties: specialtiesSchema.optional(),
    address: clinicAddressSchema.optional(),
    location: clinicLocationSchema.optional(),
    consultationFee: z.number().min(0).optional(),
    averageConsultationTime: z.number().min(0).optional(),
    banner: z.string().optional(),
    logo: z.string().optional(),
  })
  .strict();

/** Self profile update for the Clinic app — same editable fields as the admin
 *  update, including the operational status. */
export const updateClinicProfileSchema = adminUpdateClinicSchema;

export type ListClinicsQuery = z.infer<typeof listClinicsQuerySchema>;
export type AdminUpdateClinicBody = z.infer<typeof adminUpdateClinicSchema>;
export type BanBody = z.infer<typeof banSchema>;
export type RegisterClinicBody = z.infer<typeof registerClinicSchema>;
