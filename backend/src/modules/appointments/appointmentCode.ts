import { Schema, model, type Model } from 'mongoose';

/**
 * A tiny per-key atomic counter used to mint human-readable, globally-unique
 * appointment reference codes (e.g. "OC-20260930-0007"). Keyed by calendar day so
 * the running number resets each day; the embedded date keeps codes unique across
 * days, and the daily sequence keeps them unique within a day (platform-wide, so
 * two clinics can never collide on the same code).
 *
 * The increment runs on its OWN atomic findOneAndUpdate, deliberately NOT tied to
 * the booking transaction's session: a Mongo multi-document transaction cannot
 * create this collection on first use, and a number burnt by a rare transaction
 * retry only leaves a harmless gap in the sequence — never a duplicate code.
 */
interface AppointmentCounterDoc {
  _id: string; // e.g. "appt:2026-09-30"
  seq: number;
}

const counterSchema = new Schema<AppointmentCounterDoc>({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

const AppointmentCounter: Model<AppointmentCounterDoc> =
  model<AppointmentCounterDoc>('AppointmentCounter', counterSchema);

/** Reserve and format the next appointment code for a "YYYY-MM-DD" day. */
export async function nextAppointmentCode(date: string): Promise<string> {
  const doc = await AppointmentCounter.findByIdAndUpdate(
    `appt:${date}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).exec();
  const seq = doc?.seq ?? 1;
  return `OC-${date.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;
}
