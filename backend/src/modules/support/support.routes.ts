import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { supportController } from './support.controller';
import {
  listTicketsQuerySchema,
  createTicketSchema,
  respondSchema,
  updateTicketSchema,
} from './support.validation';

/** Admin/staff-facing support queue — mounted at /api/v1/admin/support. */
export const adminSupportRoutes = Router();
adminSupportRoutes.use(adminAuth, authorize(PERMISSIONS.SUPPORT_VIEW));

adminSupportRoutes.get('/', validate({ query: listTicketsQuerySchema }), supportController.list);
adminSupportRoutes.get('/:id', validate({ params: idParamSchema }), supportController.getById);
adminSupportRoutes.post(
  '/:id/respond',
  validate({ params: idParamSchema, body: respondSchema }),
  supportController.respond,
);
adminSupportRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTicketSchema }),
  supportController.update,
);

/** App-facing support for end-users — mounted at /api/v1/user/support. */
export const userSupportRoutes = Router();
userSupportRoutes.use(firebaseAuth('USER'));
userSupportRoutes.post('/', validate({ body: createTicketSchema }), supportController.create);
userSupportRoutes.get('/', validate({ query: listTicketsQuerySchema }), supportController.listMine);

/** App-facing support for clinics — mounted at /api/v1/clinic/support. */
export const clinicSupportRoutes = Router();
clinicSupportRoutes.use(firebaseAuth('CLINIC'));
clinicSupportRoutes.post('/', validate({ body: createTicketSchema }), supportController.create);
clinicSupportRoutes.get('/', supportController.listMine);
clinicSupportRoutes.get('/:id', validate({ params: idParamSchema }), supportController.getMine);
clinicSupportRoutes.post(
  '/:id/respond',
  validate({ params: idParamSchema, body: respondSchema }),
  supportController.respondMine,
);
