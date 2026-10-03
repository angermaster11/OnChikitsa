import { z } from 'zod';
import { APPOINTMENT_STATUS, GENDER } from '../../utils/constants';
import { objectIdSchema, paginationQuerySchema } from '../../utils/validators';

/** "YYYY-MM-DD". Calendar validity (real month/day) is enforced in the service. */
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
/** "HH:MM" on a 24-hour clock. */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

/** Who the appointment is for (booking form). */
export const patientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number'),
    age: z.number().int().min(0).max(150).optional(),
    gender: z.nativeEnum(GENDER).optional(),
  })
  .strict();

/** Create a booking. The slot (date + start/end) must be one the clinic actually
 *  offers; that is validated against generated slots in the service. */
export const createBookingSchema = z
  .object({
    clinicId: objectIdSchema,
    date: dateStr,
    slotStart: hhmm,
    slotEnd: hhmm,
    patient: patientSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((b) => b.slotStart < b.slotEnd, {
    message: 'Slot end must be after its start',
    path: ['slotEnd'],
  });

/** "My bookings" list query: pagination + optional upcoming/past scope. */
export const listMyBookingsQuerySchema = paginationQuerySchema.extend({
  scope: z.enum(['upcoming', 'past', 'all']).default('all'),
});

/** A human-readable appointment code (e.g. "OC-20260930-0007"). */
const appointmentCodeStr = z.string().trim().regex(/^OC-\d{8}-\d{4}$/, 'Invalid appointment ID');

/** Look up a booking by code to confirm details before a free re-book. */
export const rebookLookupSchema = z
  .object({ appointmentCode: appointmentCodeStr, clinicId: objectIdSchema })
  .strict();

/** Free re-book: claim a new ₹0 slot using an existing (still-valid) token. */
export const rebookSchema = z
  .object({
    appointmentCode: appointmentCodeStr,
    clinicId: objectIdSchema,
    date: dateStr,
    slotStart: hhmm,
    slotEnd: hhmm,
  })
  .strict()
  .refine((b) => b.slotStart < b.slotEnd, { message: 'Slot end must be after its start', path: ['slotEnd'] });

/** Clinic day-view query: pagination + optional calendar day + status filter. */
export const listClinicAppointmentsQuerySchema = paginationQuerySchema.extend({
  date: dateStr.optional(),
  status: z.nativeEnum(APPOINTMENT_STATUS).optional(),
});

/** Clinic-side status change. BOOKED is never a target (no going back to booked). */
export const updateAppointmentStatusSchema = z
  .object({
    status: z.enum([
      APPOINTMENT_STATUS.ARRIVED,
      APPOINTMENT_STATUS.CONSULTING,
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.NO_SHOW,
      APPOINTMENT_STATUS.CANCELLED,
    ]),
  })
  .strict();

/** Clinic-side skip toggle: push a still-waiting patient to the queue tail, or
 *  undo it. Orthogonal to the status transition above. */
export const skipAppointmentSchema = z
  .object({ skipped: z.boolean() })
  .strict();

export type CreateBookingBody = z.infer<typeof createBookingSchema>;
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>;
export type ListClinicAppointmentsQuery = z.infer<typeof listClinicAppointmentsQuerySchema>;
export type UpdateAppointmentStatusBody = z.infer<typeof updateAppointmentStatusSchema>;
export type SkipAppointmentBody = z.infer<typeof skipAppointmentSchema>;
export type RebookLookupBody = z.infer<typeof rebookLookupSchema>;
export type RebookBody = z.infer<typeof rebookSchema>;
