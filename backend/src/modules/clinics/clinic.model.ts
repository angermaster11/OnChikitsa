import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { CLINIC_STATUS, type ClinicStatus } from '../../utils/constants';

/** Postal address, all parts optional so a clinic can save what it has. */
export interface ClinicAddress {
  line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formatted?: string;
}

/** GPS coordinates captured from "Use current location". */
export interface ClinicLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt?: Date;
}

/**
 * Appointment slot rules for the clinic (the "Slot Configuration" screen in the
 * clinic app). All optional so a clinic can save a partial config; the app
 * falls back to sensible defaults for anything unset.
 */
export interface SlotConfiguration {
  slotDurationMin?: number;      // length of each consultation slot, minutes
  breakBetweenSlotsMin?: number; // buffer added after each slot, minutes
  maxPatientsPerSlot?: number;   // overbooking capacity per slot
  advanceBookingDays?: number;   // how far ahead patients may book
  sameDayBooking?: boolean;      // allow patients to book for today
  bookingEnabled?: boolean;      // accepting new online bookings
}

/** One open window within a day, times as 24-hour "HH:MM". */
export interface DayWindow {
  start: string;
  end: string;
}

/**
 * Clinic-wide weekly opening hours. Each weekday holds zero or more open
 * windows (e.g. 09:00–12:00 and 16:00–20:00). An empty array means the clinic
 * is closed that weekday (a weekly off, e.g. Sunday).
 */
export interface WeeklyHours {
  sun?: DayWindow[];
  mon?: DayWindow[];
  tue?: DayWindow[];
  wed?: DayWindow[];
  thu?: DayWindow[];
  fri?: DayWindow[];
  sat?: DayWindow[];
}

/**
 * One clinic account = one clinic (no multi-role/staff hierarchy inside it).
 * Authenticated via Firebase phone OTP; no password stored. Doctors are a
 * separate collection referencing this clinic.
 */
export interface ClinicDoc extends Document<Types.ObjectId> {
  firebaseUid: string;
  name: string;
  phone1: string;
  phone2?: string;
  email?: string;
  yearsOld?: number;
  banner?: string;
  logo?: string;
  description?: string;
  specification?: string;
  specialties?: string[];
  address?: ClinicAddress;
  location?: ClinicLocation | null;
  slotConfiguration?: SlotConfiguration;
  weeklyHours?: WeeklyHours;
  holidays?: string[];           // specific closed dates, "YYYY-MM-DD"
  status: ClinicStatus;
  consultationFee?: number;
  /** How many days a booking's token stays valid for a free re-book (0/absent = no free re-book). */
  tokenValidityDays?: number;
  averageConsultationTime?: number;
  /** Denormalized rating aggregate — updated atomically on each review so clinic
   *  reads never aggregate. ratingAvg = ratingSum / ratingCount (1 decimal, 0 when none). */
  ratingSum?: number;
  ratingCount?: number;
  ratingAvg?: number;
  /** Per-clinic commission override (0–100). Falls back to settings.defaultCommissionPercent. */
  commissionPercent?: number | null;
  bannedAt?: Date | null;
  bannedBy?: Types.ObjectId | null;
  banReason?: string | null;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<ClinicAddress>(
  {
    line: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    formatted: { type: String, trim: true },
  },
  { _id: false },
);

const locationSchema = new Schema<ClinicLocation>(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const slotConfigurationSchema = new Schema<SlotConfiguration>(
  {
    slotDurationMin: { type: Number, min: 5, max: 240 },
    breakBetweenSlotsMin: { type: Number, min: 0, max: 120 },
    maxPatientsPerSlot: { type: Number, min: 1, max: 50 },
    advanceBookingDays: { type: Number, min: 0, max: 365 },
    sameDayBooking: { type: Boolean },
    bookingEnabled: { type: Boolean },
  },
  { _id: false },
);

const dayWindowSchema = new Schema<DayWindow>(
  {
    start: { type: String, required: true }, // "HH:MM", 24-hour
    end: { type: String, required: true },
  },
  { _id: false },
);

const weeklyHoursSchema = new Schema<WeeklyHours>(
  {
    sun: { type: [dayWindowSchema], default: undefined },
    mon: { type: [dayWindowSchema], default: undefined },
    tue: { type: [dayWindowSchema], default: undefined },
    wed: { type: [dayWindowSchema], default: undefined },
    thu: { type: [dayWindowSchema], default: undefined },
    fri: { type: [dayWindowSchema], default: undefined },
    sat: { type: [dayWindowSchema], default: undefined },
  },
  { _id: false },
);

const clinicSchema = new Schema<ClinicDoc>(
  {
    firebaseUid: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone1: { type: String, required: true, trim: true },
    phone2: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    yearsOld: { type: Number, min: 0 },
    banner: { type: String },
    logo: { type: String },
    description: { type: String },
    specification: { type: String },
    specialties: { type: [String], default: undefined },
    address: { type: addressSchema, default: undefined },
    location: { type: locationSchema, default: null },
    slotConfiguration: { type: slotConfigurationSchema, default: undefined },
    weeklyHours: { type: weeklyHoursSchema, default: undefined },
    holidays: { type: [String], default: undefined },
    status: {
      type: String,
      enum: Object.values(CLINIC_STATUS),
      default: CLINIC_STATUS.ACTIVE,
      required: true,
    },
    consultationFee: { type: Number, min: 0 },
    tokenValidityDays: { type: Number, min: 0, max: 365 },
    averageConsultationTime: { type: Number, min: 0 },
    // Denormalized rating aggregate (see interface). Updated via an atomic pipeline
    // update on review create/change; reads never recompute it.
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    commissionPercent: { type: Number, min: 0, max: 100, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    banReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
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

clinicSchema.index({ phone1: 1 });
clinicSchema.index({ email: 1 }, { sparse: true });
clinicSchema.index({ status: 1, createdAt: -1 });
clinicSchema.index({ createdAt: -1 });
clinicSchema.index({ name: 'text' });

export const Clinic: Model<ClinicDoc> = model<ClinicDoc>('Clinic', clinicSchema);
