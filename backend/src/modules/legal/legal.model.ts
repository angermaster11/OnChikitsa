import { Schema, Model, model, Document } from 'mongoose';

export interface LegalDoc extends Document {
  key: string;
  privacyPolicy: string;
  termsAndConditions: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LEGAL_SETTINGS_KEY = 'legal';

const legalSchema = new Schema<LegalDoc>(
  {
    key: { type: String, required: true, unique: true, default: LEGAL_SETTINGS_KEY },
    privacyPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
  },
  {
    collection: 'legal',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Legal: Model<LegalDoc> = model<LegalDoc>('Legal', legalSchema);
