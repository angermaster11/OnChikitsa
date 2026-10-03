import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type BroadcastAudienceType = 'ALL_PATIENTS' | 'CLINIC_PATIENTS' | 'ALL_CLINICS';

/**
 * An admin-sent push broadcast. Stored once (NOT fanned out per recipient): the
 * patient notification list unions these with each user's personal rows at read
 * time, so sending to "all patients" is O(1) writes regardless of audience size.
 */
export interface BroadcastDoc extends Document<Types.ObjectId> {
  title: string;
  body: string;
  audienceType: BroadcastAudienceType;
  clinicId?: Types.ObjectId | null; // for CLINIC_PATIENTS
  sentBy: Types.ObjectId;
  sentCount: number; // devices targeted
  createdAt: Date;
  updatedAt: Date;
}

const broadcastSchema = new Schema<BroadcastDoc>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    audienceType: {
      type: String,
      enum: ['ALL_PATIENTS', 'CLINIC_PATIENTS', 'ALL_CLINICS'],
      required: true,
    },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', default: null },
    sentBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    sentCount: { type: Number, default: 0, min: 0 },
  },
  {
    collection: 'broadcasts',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

broadcastSchema.index({ createdAt: -1 });
broadcastSchema.index({ audienceType: 1, clinicId: 1, createdAt: -1 });

export const Broadcast: Model<BroadcastDoc> = model<BroadcastDoc>('Broadcast', broadcastSchema);
