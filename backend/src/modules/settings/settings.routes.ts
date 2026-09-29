import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { settingsController } from './settings.controller';
import { updatePricingSettingsSchema } from './settings.validation';

/** Admin-facing pricing settings — mounted at /api/v1/admin/settings. */
export const adminSettingsRoutes = Router();
adminSettingsRoutes.use(adminAuth);

adminSettingsRoutes.get(
  '/',
  authorize(PERMISSIONS.SETTINGS_VIEW),
  settingsController.getPricing,
);
adminSettingsRoutes.patch(
  '/',
  authorize(PERMISSIONS.SETTINGS_UPDATE),
  validate({ body: updatePricingSettingsSchema }),
  settingsController.updatePricing,
);
