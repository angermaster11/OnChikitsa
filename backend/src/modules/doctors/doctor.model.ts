import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { DOCTOR_STATUS, GENDER, type DoctorStatus, type Gender } from '../../utils/constants';

/**
 * A doctor currently belongs to exactly one clinic (`clinicId`). The field is a
 * ref rather than an embedded document precisely so a future many-to-many
 * clinic/doctor relationship (e.g. a `clinicIds` array or a join collection) can
 * be introduced without reshaping the whole model.
 */
export interface DoctorDoc extends Document<Types.ObjectId> {
  clinicId: Types.ObjectId;
  name: string;
  qualification?: string;
  specialization?: string;
  age?: number;
  gender?: Gender;
  email?: string;
  phone?: string;
  photo?: string;
  experience?: number;
  registrationNo?: string;
  consultationFee?: number;
  status: DoctorStatus;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<DoctorDoc>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
    name: { type: String, required: true, trim: true },
    qualification: { type: String, trim: true },
    specialization: { type: String, trim: true },
    age: { type: Number, min: 0 },
    gender: { type: String, enum: Object.values(GENDER) },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    photo: { type: String },
    experience: { type: Number, min: 0 },
    registrationNo: { type: String, trim: true },
    consultationFee: { type: Number, min: 0 },
    status: {
      type: String,
      enum: Object.values(DOCTOR_STATUS),
      default: DOCTOR_STATUS.ACTIVE,
      required: true,
    },
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

doctorSchema.index({ clinicId: 1, status: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ createdAt: -1 });

export const Doctor: Model<DoctorDoc> = model<DoctorDoc>('Doctor', doctorSchema);
