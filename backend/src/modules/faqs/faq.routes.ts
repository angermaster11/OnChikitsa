import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { faqController } from './faq.controller';
import { listFaqsQuerySchema, createFaqSchema, updateFaqSchema } from './faq.validation';

/** Admin-facing FAQ management (CRUD) — mounted at /api/v1/admin/faqs. */
export const adminFaqRoutes = Router();
adminFaqRoutes.use(adminAuth);

adminFaqRoutes.get(
  '/',
  authorize(PERMISSIONS.FAQ_VIEW),
  validate({ query: listFaqsQuerySchema }),
  faqController.list,
);
adminFaqRoutes.get(
  '/:id',
  authorize(PERMISSIONS.FAQ_VIEW),
  validate({ params: idParamSchema }),
  faqController.getById,
);
adminFaqRoutes.post(
  '/',
  authorize(PERMISSIONS.FAQ_CREATE),
  validate({ body: createFaqSchema }),
  faqController.create,
);
adminFaqRoutes.patch(
  '/:id',
  authorize(PERMISSIONS.FAQ_UPDATE),
  validate({ params: idParamSchema, body: updateFaqSchema }),
  faqController.update,
);
adminFaqRoutes.delete(
  '/:id',
  authorize(PERMISSIONS.FAQ_DELETE),
  validate({ params: idParamSchema }),
  faqController.remove,
);

/** App-facing FAQ list for end-users — mounted at /api/v1/user/faqs. Read-only. */
export const userFaqRoutes = Router();
userFaqRoutes.use(firebaseAuth('USER'));
userFaqRoutes.get('/', faqController.listActive);
