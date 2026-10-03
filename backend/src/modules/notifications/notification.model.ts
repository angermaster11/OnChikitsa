import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * A patient's in-app notification (the bell / alerts list). Written alongside a
 * push send for appointment events (booking confirmed / arrived / completed). Admin
 * broadcasts are NOT stored here per-user — they live in the Broadcast collection
 * and are merged into the list at read time (see notification.service).
 */
export interface NotificationDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  type: 'booking' | 'reminder' | 'admin';
  title: string;
  body: string;
  /** Client hints, e.g. { route: '/bookings', appointmentId, event }. */
  data?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['booking', 'reminder', 'admin'], default: 'booking' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    collection: 'notifications',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// A user's notifications, newest first.
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<NotificationDoc> = model<NotificationDoc>('Notification', notificationSchema);
