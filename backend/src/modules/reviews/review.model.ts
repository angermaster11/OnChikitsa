import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * A patient's rating + feedback for ONE completed appointment. Exactly one review
 * per appointment (unique index on appointmentId). `userId` is stored only for
 * ownership + de-duplication and is NEVER exposed in any response — reviews are
 * shown anonymously to clinics, patients and admins. The clinic's running average
 * is kept denormalized on the Clinic doc (ratingSum/ratingCount/ratingAvg), updated
 * atomically when a review is created or changed, so clinic reads never aggregate.
 */
export interface ReviewDoc extends Document<Types.ObjectId> {
  appointmentId: Types.ObjectId;
  clinicId: Types.ObjectId;
  userId: Types.ObjectId; // internal only — never serialized to clients
  rating: number; // 1..5
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDoc>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: null },
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

// One review per appointment.
reviewSchema.index({ appointmentId: 1 }, { unique: true });
// A clinic's reviews, newest first (anonymous paginated list).
reviewSchema.index({ clinicId: 1, createdAt: -1 });

export const Review: Model<ReviewDoc> = model<ReviewDoc>('Review', reviewSchema);
