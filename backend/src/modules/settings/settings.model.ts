import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { GST_BASE, type GstBase } from '../../utils/constants';

/**
 * Global pricing settings — a SINGLETON document (there is exactly one, keyed
 * `pricing`). It is the admin-configured source of truth for how a booking's
 * total is built and split:
 *  - platformFeePaise        — flat platform charge added to every booking
 *  - gstRate                 — GST percentage (default 18)
 *  - defaultCommissionPercent— platform's cut of the consultation fee when a
 *                              clinic has no per-clinic override (default 10)
 *  - gstBase                 — which amount GST applies to (see GST_BASE)
 *
 * All money is integer paise. The doc is upserted on first read so the app
 * always has sane defaults even before an admin visits the settings screen.
 */
export interface SettingsDoc extends Document<Types.ObjectId> {
  key: string;
  platformFeePaise: number;
  gstRate: number;
  defaultCommissionPercent: number;
  gstBase: GstBase;
  currency: string;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PRICING_SETTINGS_KEY = 'pricing';

/** Defaults applied when the pricing doc is first created (₹25 fee, 18% GST, 10% cut). */
export const PRICING_DEFAULTS = {
  platformFeePaise: 2500,
  gstRate: 18,
  defaultCommissionPercent: 10,
  gstBase: GST_BASE.PLATFORM_REVENUE as GstBase,
  currency: 'INR',
} as const;

const settingsSchema = new Schema<SettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: PRICING_SETTINGS_KEY },
    platformFeePaise: { type: Number, required: true, min: 0, default: PRICING_DEFAULTS.platformFeePaise },
    gstRate: { type: Number, required: true, min: 0, max: 100, default: PRICING_DEFAULTS.gstRate },
    defaultCommissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: PRICING_DEFAULTS.defaultCommissionPercent,
    },
    gstBase: {
      type: String,
      enum: Object.values(GST_BASE),
      required: true,
      default: PRICING_DEFAULTS.gstBase,
    },
    currency: { type: String, required: true, default: PRICING_DEFAULTS.currency },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  {
    collection: 'settings',
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Settings: Model<SettingsDoc> = model<SettingsDoc>('Settings', settingsSchema);
