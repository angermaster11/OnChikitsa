import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * A single device's FCM registration token for push notifications. One row per
 * token (unique), owned by a USER or CLINIC. A person can have several (multiple
 * devices). Tokens rotate, so the app re-registers on launch (upsert by token),
 * and tokens FCM reports as unregistered are pruned on send.
 */
export interface DeviceTokenDoc extends Document<Types.ObjectId> {
  ownerType: 'USER' | 'CLINIC';
  ownerId: Types.ObjectId;
  token: string;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<DeviceTokenDoc>(
  {
    ownerType: { type: String, enum: ['USER', 'CLINIC'], required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: 'android' },
  },
  {
    collection: 'device_tokens',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Targeting: all tokens for a given owner (or set of owners).
deviceTokenSchema.index({ ownerType: 1, ownerId: 1 });

export const DeviceToken: Model<DeviceTokenDoc> = model<DeviceTokenDoc>('DeviceToken', deviceTokenSchema);
