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
 * `tokenNo` is the patient's 1-based position in the clinic's queue for the whole
 * DAY (first confirmed booker = token 1), so it doubles as the day's queue
 * sequence across every slot. `appointmentCode` is a separate human-readable,
 * globally-unique reference for the booking. A small clinic-name snapshot is kept
 * so "my bookings" can render without joining back to the clinic.
 */
export interface AppointmentDoc extends Document<Types.ObjectId> {
  clinicId: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;      // "YYYY-MM-DD" (server-local)
  slotStart: string; // "HH:MM" 24-hour
  slotEnd: string;   // "HH:MM" 24-hour
  tokenNo: number;   // 1-based queue position for the whole day (0 while PENDING_PAYMENT — assigned at confirmation)
  /** Human-readable, globally-unique booking reference (e.g. "OC-20260930-0007").
   *  Assigned at confirmation alongside tokenNo; absent on a PENDING_PAYMENT hold. */
  appointmentCode?: string | null;
  /** "YYYY-MM-DD" the token stays valid for a free re-book (booking date + clinic
   *  tokenValidityDays). Anchored to the paid visit: a free re-book inherits this,
   *  it never extends. null = clinic has no validity window (no free re-book). */
  tokenValidUntil?: string | null;
  /** For a free re-book: the ORIGINAL (paid) appointment this one derives from. */
  rebookOf?: Types.ObjectId | null;
  /** For a free re-book: the appointment code the patient entered to claim it. */
  originalAppointmentCode?: string | null;
  status: AppointmentStatus;
  patient: PatientSnapshot;
  reason?: string;
  clinicName: string;
  clinicArea?: string;
  /** Linked payment (Razorpay Route order) for a paid booking; null for legacy/free bookings. */
  paymentId?: Types.ObjectId | null;
  /** For a PENDING_PAYMENT hold: when the reserved seat lapses if unpaid. Cleared on confirm. */
  holdExpiresAt?: Date | null;
  /** Atomic overbooking guard. While this booking occupies a seat it carries a
   *  unique key `"<clinicId>:<date>:<slotStart>:<seatNo>"`; a partial-unique index
   *  turns two concurrent claims on the same seat into an E11000 (one wins). Set to
   *  null when the seat is released (cancel / lapsed hold / failed payment), which
   *  drops it from the partial index so the seat is claimable again. */
  seatKey?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: 'USER' | 'CLINIC' | null;
  /** When the clinic last "skipped" this patient in the live queue: the booking
   *  stays in the queue but sorts to the tail (latest skip = furthest back).
   *  null = not skipped. Orthogonal to `status` (a skipped patient is still BOOKED). */
  skippedAt?: Date | null;
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
    tokenNo: { type: Number, required: true, min: 0 }, // 0 = unassigned (PENDING_PAYMENT hold); else 1-based day queue position
    // No default: left ABSENT (not null) on a hold so the sparse/partial unique
    // index below only indexes real, assigned codes — many missing fields never collide.
    appointmentCode: { type: String },
    tokenValidUntil: { type: String, default: null },
    rebookOf: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
    originalAppointmentCode: { type: String, default: null },
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
    // Null (not a string) while no seat is held, so the partial-unique index below
    // only indexes active seat claims — released seats never collide on null.
    seatKey: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['USER', 'CLINIC'], default: null },
    skippedAt: { type: Date, default: null },
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
// Globally-unique human-readable code. Partial (not sparse) so only docs that
// actually carry a string code are indexed — holds (no code) never collide.
appointmentSchema.index(
  { appointmentCode: 1 },
  { unique: true, partialFilterExpression: { appointmentCode: { $type: 'string' } } },
);
// "My bookings", newest first.
appointmentSchema.index({ userId: 1, createdAt: -1 });
// Sweep/occupancy of live PENDING_PAYMENT holds (bounded by holdExpiresAt).
appointmentSchema.index({ status: 1, holdExpiresAt: 1 });
// Atomic overbooking guard: at most one active claim per "clinic:date:slot:seatNo".
// Partial so only rows actually holding a seat (string seatKey) are constrained —
// released seats (seatKey:null) drop out and can be reclaimed.
appointmentSchema.index(
  { seatKey: 1 },
  { unique: true, partialFilterExpression: { seatKey: { $type: 'string' } } },
);

export const Appointment: Model<AppointmentDoc> = model<AppointmentDoc>('Appointment', appointmentSchema);
