import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import {
  APPOINTMENT_STATUS,
  GENDER,
  type AppointmentStatus,
  type Gender,
} from '../../utils/constants';

/**
 * Who the appointment is for. Snapshotted onto the appointment at booking time
 * so the record stays meaningful even if the patient later edits their profile,
 * and so a booking can be made "for someone else" (a family member) without a
 * separate patient record. `name`/`phone` are always captured; age/gender are
 * whatever the booking form collected.
 */
export interface PatientSnapshot {
  name: string;
  phone: string;
  age?: number;
  gender?: Gender;
}

/**
 * A patient's booking of one clinic slot on one calendar day.
 *
 * Slots are not their own collection — they are computed on the fly from the
 * clinic's weeklyHours + slotConfiguration (see ../appointments/slots.ts). An
 * Appointment therefore stores the concrete slot it landed in as plain
 * date + "HH:MM" strings (server-local, single-region app) rather than a slot id.
 *
 * `tokenNo` is the patient's 1-based position within that specific slot (first
 * booker = token 1). A small clinic-name snapshot is kept so "my bookings" can
 * render without joining back to the clinic.
 */
export interface AppointmentDoc extends Document<Types.ObjectId> {
  clinicId: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;      // "YYYY-MM-DD" (server-local)
  slotStart: string; // "HH:MM" 24-hour
  slotEnd: string;   // "HH:MM" 24-hour
  tokenNo: number;   // 1-based position within the slot (0 while PENDING_PAYMENT — assigned at confirmation)
  status: AppointmentStatus;
  patient: PatientSnapshot;
  reason?: string;
  clinicName: string;
  clinicArea?: string;
  /** Linked payment (Razorpay Route order) for a paid booking; null for legacy/free bookings. */
  paymentId?: Types.ObjectId | null;
  /** For a PENDING_PAYMENT hold: when the reserved seat lapses if unpaid. Cleared on confirm. */
  holdExpiresAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: 'USER' | 'CLINIC' | null;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientSnapshot>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 150 },
    gender: { type: String, enum: Object.values(GENDER) },
  },
  { _id: false },
);

const appointmentSchema = new Schema<AppointmentDoc>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    slotStart: { type: String, required: true }, // "HH:MM"
    slotEnd: { type: String, required: true },
    tokenNo: { type: Number, required: true, min: 0 }, // 0 = unassigned (PENDING_PAYMENT hold)
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.BOOKED,
      required: true,
    },
    patient: { type: patientSchema, required: true },
    reason: { type: String, trim: true },
    clinicName: { type: String, required: true },
    clinicArea: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
    holdExpiresAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['USER', 'CLINIC'], default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Occupancy counting + a clinic's day view: all bookings for a clinic on a date,
// ordered within a slot by token.
appointmentSchema.index({ clinicId: 1, date: 1, slotStart: 1, tokenNo: 1 });
// "My bookings", newest first.
appointmentSchema.index({ userId: 1, createdAt: -1 });
// Sweep/occupancy of live PENDING_PAYMENT holds (bounded by holdExpiresAt).
appointmentSchema.index({ status: 1, holdExpiresAt: 1 });

export const Appointment: Model<AppointmentDoc> = model<AppointmentDoc>('Appointment', appointmentSchema);
