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
  status: ClinicStatus;
  consultationFee?: number;
  averageConsultationTime?: number;
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
    status: {
      type: String,
      enum: Object.values(CLINIC_STATUS),
      default: CLINIC_STATUS.ACTIVE,
      required: true,
    },
    consultationFee: { type: Number, min: 0 },
    averageConsultationTime: { type: Number, min: 0 },
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
