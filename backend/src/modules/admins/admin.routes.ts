import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { adminController } from './admin.controller';
import { listAdminsQuerySchema, createAdminSchema, updateAdminSchema } from './admin.validation';

/**
 * Staff (admin/support) management — mounted at /api/v1/admin/admins.
 * Listing/viewing needs ADMIN_VIEW (SUPER_ADMIN only by default). Create/update/
 * disable perform fine-grained, role-specific permission checks in the service
 * (ADMIN_* vs SUPPORT_*), so the route only requires an authenticated staff actor.
 */
export const adminManagementRoutes = Router();
adminManagementRoutes.use(adminAuth);

adminManagementRoutes.get(
  '/',
  authorize(PERMISSIONS.ADMIN_VIEW),
  validate({ query: listAdminsQuerySchema }),
  adminController.list,
);
adminManagementRoutes.get(
  '/:id',
  authorize(PERMISSIONS.ADMIN_VIEW),
  validate({ params: idParamSchema }),
  adminController.getById,
);
adminManagementRoutes.post('/', validate({ body: createAdminSchema }), adminController.create);
adminManagementRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateAdminSchema }),
  adminController.update,
);
adminManagementRoutes.post('/:id/disable', validate({ params: idParamSchema }), adminController.disable);
