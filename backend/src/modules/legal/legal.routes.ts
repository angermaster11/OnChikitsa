import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { legalController } from './legal.controller';
import { updateLegalSchema } from './legal.validation';

export const publicLegalRoutes = Router();
publicLegalRoutes.get('/', legalController.getLegal);

export const adminLegalRoutes = Router();
adminLegalRoutes.use(adminAuth);
adminLegalRoutes.get(
  '/',
  authorize(PERMISSIONS.SETTINGS_VIEW),
  legalController.getLegal,
);
adminLegalRoutes.patch(
  '/',
  authorize(PERMISSIONS.SETTINGS_UPDATE),
  validate({ body: updateLegalSchema }),
  legalController.updateLegal,
);
