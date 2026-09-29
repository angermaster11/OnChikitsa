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

export const settingsService = {
  /**
   * The pricing singleton, upserted on first read so callers never see null.
   * `$setOnInsert` makes concurrent first-reads converge on one document.
   */
  async getPricing(): Promise<SettingsDoc> {
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
  },

  async updatePricing(
    actor: AuthActor,
    data: UpdatePricingSettingsBody,
    ctx: Ctx,
  ): Promise<SettingsDoc> {
    const doc = await settingsService.getPricing();
    if (data.platformFeePaise !== undefined) doc.platformFeePaise = data.platformFeePaise;
    if (data.gstRate !== undefined) doc.gstRate = data.gstRate;
    if (data.defaultCommissionPercent !== undefined) {
      doc.defaultCommissionPercent = data.defaultCommissionPercent;
    }
    if (data.gstBase !== undefined) doc.gstBase = data.gstBase;
    if (Types.ObjectId.isValid(actor.id)) doc.updatedBy = new Types.ObjectId(actor.id);
    await doc.save();

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
