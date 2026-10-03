import { z } from 'zod';
import { CLINIC_STATUS } from '../../utils/constants';
import { paginationQuerySchema, dateRangeQuerySchema, phoneSchema } from '../../utils/validators';

/** Admin list query: pagination + search + filters. */
export const listClinicsQuerySchema = paginationQuerySchema.merge(dateRangeQuerySchema).extend({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(CLINIC_STATUS).optional(),
});

/** Patient-facing clinic list: pagination + free-text search + specialty + city filter. */
export const listPatientClinicsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  specialty: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(120).optional(),
});

/** Slot-availability query for a patient: which calendar day to price out. */
export const slotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
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

/** Appointment slot rules ("Slot Configuration" screen). All parts optional. */
export const slotConfigurationSchema = z
  .object({
    slotDurationMin: z.number().int().min(5).max(240).optional(),
    breakBetweenSlotsMin: z.number().int().min(0).max(120).optional(),
    maxPatientsPerSlot: z.number().int().min(1).max(50).optional(),
    advanceBookingDays: z.number().int().min(0).max(365).optional(),
    sameDayBooking: z.boolean().optional(),
    bookingEnabled: z.boolean().optional(),
  })
  .strict();

/** "HH:MM" on a 24-hour clock. */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

/** One open window within a day; end must be after start. */
const dayWindowSchema = z
  .object({ start: hhmm, end: hhmm })
  .strict()
  .refine((w) => w.start < w.end, { message: 'Window end must be after its start' });

const dayWindowsSchema = z.array(dayWindowSchema).max(6);

/** Clinic-wide weekly opening hours; an empty (or absent) day = closed that day. */
export const weeklyHoursSchema = z
  .object({
    sun: dayWindowsSchema.optional(),
    mon: dayWindowsSchema.optional(),
    tue: dayWindowsSchema.optional(),
    wed: dayWindowsSchema.optional(),
    thu: dayWindowsSchema.optional(),
    fri: dayWindowsSchema.optional(),
    sat: dayWindowsSchema.optional(),
  })
  .strict();

/** Specific dates the clinic stays closed, each "YYYY-MM-DD". */
export const holidaysSchema = z
  .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'))
  .max(366);

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
    slotConfiguration: slotConfigurationSchema.optional(),
    weeklyHours: weeklyHoursSchema.optional(),
    holidays: holidaysSchema.optional(),
    consultationFee: z.number().min(0).optional(),
    tokenValidityDays: z.number().int().min(0).max(365).optional(),
    averageConsultationTime: z.number().min(0).optional(),
    // Per-clinic commission override (admin-only). Falls back to the global
    // default when null/absent. NOT part of the clinic self-update schema below.
    commissionPercent: z.number().min(0).max(100).nullable().optional(),
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
    slotConfiguration: slotConfigurationSchema.optional(),
    weeklyHours: weeklyHoursSchema.optional(),
    holidays: holidaysSchema.optional(),
    consultationFee: z.number().min(0).optional(),
    tokenValidityDays: z.number().int().min(0).max(365).optional(),
    averageConsultationTime: z.number().min(0).optional(),
    banner: z.string().optional(),
    logo: z.string().optional(),
  })
  .strict();

/** Self profile update for the Clinic app — same editable fields as the admin
 *  update, including the operational status, but NOT the commission (that is set
 *  by admins only; a clinic must not raise/lower its own platform cut). */
export const updateClinicProfileSchema = adminUpdateClinicSchema.omit({ commissionPercent: true });

export type ListClinicsQuery = z.infer<typeof listClinicsQuerySchema>;
export type ListPatientClinicsQuery = z.infer<typeof listPatientClinicsQuerySchema>;
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;
export type AdminUpdateClinicBody = z.infer<typeof adminUpdateClinicSchema>;
export type BanBody = z.infer<typeof banSchema>;
export type RegisterClinicBody = z.infer<typeof registerClinicSchema>;
