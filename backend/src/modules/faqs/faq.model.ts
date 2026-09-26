import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * A frequently-asked question shown on the app's Support screen. FAQs are simple
 * global content managed entirely from the admin panel (no per-user scoping).
 * `order` controls the display sequence (ascending); `isActive` hides an entry
 * from the app without deleting it. Unlike doctors/clinics there is no soft-delete
 * lifecycle — an admin removing an FAQ deletes the document outright.
 */
export interface FaqDoc extends Document<Types.ObjectId> {
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<FaqDoc>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    collection: 'faqs',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// The app fetches active FAQs ordered by `order`; the admin list sorts the same way.
faqSchema.index({ isActive: 1, order: 1 });
faqSchema.index({ order: 1, createdAt: 1 });

export const Faq: Model<FaqDoc> = model<FaqDoc>('Faq', faqSchema);
