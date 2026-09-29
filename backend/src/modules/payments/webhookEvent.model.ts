import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * Idempotency ledger for Razorpay webhooks. Razorpay guarantees at-least-once
 * delivery, so the same `event.id` can arrive twice (retries, or a race with the
 * client-side verify). We insert the id here inside the same transaction that
 * applies the event's side effects; the UNIQUE index means a duplicate insert
 * throws (E11000) and the handler treats the event as already processed — the
 * webhook and the fast-path client verify converge without double-confirming.
 */
export interface ProcessedWebhookEventDoc extends Document<Types.ObjectId> {
  eventId: string;
  event: string;
  createdAt: Date;
}

const processedWebhookEventSchema = new Schema<ProcessedWebhookEventDoc>(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
  },
  { collection: 'processed_webhook_events', timestamps: { createdAt: true, updatedAt: false } },
);

// Optional TTL housekeeping could expire old rows; kept permanent for audit for now.
export const ProcessedWebhookEvent: Model<ProcessedWebhookEventDoc> =
  model<ProcessedWebhookEventDoc>('ProcessedWebhookEvent', processedWebhookEventSchema);
