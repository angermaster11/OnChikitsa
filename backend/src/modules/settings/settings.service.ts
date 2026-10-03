import { Types } from 'mongoose';
import { ERROR_CODES, AppError } from '../../utils/errors';
import { TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { auditService } from '../audit/audit.service';
import { Settings, PRICING_SETTINGS_KEY, PRICING_DEFAULTS, type SettingsDoc } from './settings.model';
import type { AuthActor } from '../../types/auth';
import type { UpdatePricingSettingsBody } from './settings.validation';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

/**
 * In-process cache of the pricing singleton. `getPricing()` is on the hot booking
 * path (every order creation reads it), and the un-cached read was an upsert — a
 * WRITE that write-locked the one settings doc on every booking. Serving a short-
 * lived cached copy removes that contention. Writes refresh the cache immediately;
 * across multiple instances a change propagates within the TTL (acceptable for a
 * value that changes rarely). Phase 4's shared cache module can replace this.
 */
let pricingCache: { doc: SettingsDoc; at: number } | null = null;
const PRICING_CACHE_TTL_MS = 60_000;

/** The actual DB read: upsert-on-first-read so callers never see null. */
async function loadPricingDoc(): Promise<SettingsDoc> {
  const doc = await Settings.findOneAndUpdate(
    { key: PRICING_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: PRICING_SETTINGS_KEY,
        platformFeePaise: PRICING_DEFAULTS.platformFeePaise,
        gstRate: PRICING_DEFAULTS.gstRate,
        defaultCommissionPercent: PRICING_DEFAULTS.defaultCommissionPercent,
        gstBase: PRICING_DEFAULTS.gstBase,
        currency: PRICING_DEFAULTS.currency,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // findOneAndUpdate with upsert+new always returns a document.
  if (!doc) throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Failed to load pricing settings');
  return doc;
}

export const settingsService = {
  /**
   * The pricing singleton. Served from a short-lived in-process cache on the hot
   * path; `loadPricingDoc()` does the upsert-on-first-read behind it.
   */
  async getPricing(): Promise<SettingsDoc> {
    const now = Date.now();
    if (pricingCache && now - pricingCache.at < PRICING_CACHE_TTL_MS) {
      return pricingCache.doc;
    }
    const doc = await loadPricingDoc();
    pricingCache = { doc, at: now };
    return doc;
  },

  async updatePricing(
    actor: AuthActor,
    data: UpdatePricingSettingsBody,
    ctx: Ctx,
  ): Promise<SettingsDoc> {
    // Load fresh (bypass the cache) for a mutable, up-to-date doc.
    const doc = await loadPricingDoc();
    if (data.platformFeePaise !== undefined) doc.platformFeePaise = data.platformFeePaise;
    if (data.gstRate !== undefined) doc.gstRate = data.gstRate;
    if (data.defaultCommissionPercent !== undefined) {
      doc.defaultCommissionPercent = data.defaultCommissionPercent;
    }
    if (data.gstBase !== undefined) doc.gstBase = data.gstBase;
    if (Types.ObjectId.isValid(actor.id)) doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();
    // Refresh the cache so the next read reflects the change immediately on this instance.
    pricingCache = { doc, at: Date.now() };

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      targetType: TARGET_TYPE.SETTINGS,
      targetId: doc._id,
      targetName: 'Pricing settings',
      description: 'Updated pricing settings',
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return doc;
  },
};
