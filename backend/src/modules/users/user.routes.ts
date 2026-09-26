import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth, firebaseIdentity } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { ROLES } from '../../utils/constants';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { userController } from './user.controller';
import {
  listUsersQuerySchema,
  adminUpdateUserSchema,
  banSchema,
  registerUserSchema,
  updateProfileSchema,
} from './user.validation';

/** Admin-facing user management — mounted at /api/v1/admin/users. */
export const adminUserRoutes = Router();
adminUserRoutes.use(adminAuth);

adminUserRoutes.get(
  '/',
  authorize(PERMISSIONS.USER_VIEW),
  validate({ query: listUsersQuerySchema }),
  userController.list,
);
adminUserRoutes.get('/:id', authorize(PERMISSIONS.USER_VIEW), validate({ params: idParamSchema }), userController.getById);
adminUserRoutes.patch(
  '/:id',
  authorize(PERMISSIONS.USER_UPDATE),
  validate({ params: idParamSchema, body: adminUpdateUserSchema }),
  userController.update,
);
adminUserRoutes.post(
  '/:id/ban',
  authorize(PERMISSIONS.USER_BAN),
  validate({ params: idParamSchema, body: banSchema }),
  userController.ban,
);
adminUserRoutes.post(
  '/:id/unban',
  authorize(PERMISSIONS.USER_UNBAN),
  validate({ params: idParamSchema }),
  userController.unban,
);
adminUserRoutes.delete(
  '/:id',
  authorize(PERMISSIONS.USER_DELETE),
  validate({ params: idParamSchema }),
  userController.remove,
);

/** App-facing self endpoints — mounted at /api/v1/user. */
export const userAppRoutes = Router();
userAppRoutes.post(
  '/register',
  firebaseIdentity(ROLES.USER),
  validate({ body: registerUserSchema }),
  userController.register,
);
userAppRoutes.get('/me', firebaseAuth('USER'), userController.me);
userAppRoutes.patch('/me', firebaseAuth('USER'), validate({ body: updateProfileSchema }), userController.updateMe);
