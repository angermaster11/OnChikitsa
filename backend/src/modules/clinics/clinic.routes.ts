import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth, firebaseIdentity } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { ROLES } from '../../utils/constants';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { clinicController } from './clinic.controller';
import {
  listClinicsQuerySchema,
  listPatientClinicsQuerySchema,
  slotsQuerySchema,
  adminUpdateClinicSchema,
  banSchema,
  registerClinicSchema,
  updateClinicProfileSchema,
} from './clinic.validation';

/** Admin-facing clinic management — mounted at /api/v1/admin/clinics. */
export const adminClinicRoutes = Router();
adminClinicRoutes.use(adminAuth);

adminClinicRoutes.get(
  '/',
  authorize(PERMISSIONS.CLINIC_VIEW),
  validate({ query: listClinicsQuerySchema }),
  clinicController.list,
);
adminClinicRoutes.get(
  '/:id',
  authorize(PERMISSIONS.CLINIC_VIEW),
  validate({ params: idParamSchema }),
  clinicController.getById,
);
adminClinicRoutes.patch(
  '/:id',
  authorize(PERMISSIONS.CLINIC_UPDATE),
  validate({ params: idParamSchema, body: adminUpdateClinicSchema }),
  clinicController.update,
);
adminClinicRoutes.post(
  '/:id/ban',
  authorize(PERMISSIONS.CLINIC_BAN),
  validate({ params: idParamSchema, body: banSchema }),
  clinicController.ban,
);
adminClinicRoutes.post(
  '/:id/unban',
  authorize(PERMISSIONS.CLINIC_UNBAN),
  validate({ params: idParamSchema }),
  clinicController.unban,
);
adminClinicRoutes.delete(
  '/:id',
  authorize(PERMISSIONS.CLINIC_DELETE),
  validate({ params: idParamSchema }),
  clinicController.remove,
);

/** App-facing self endpoints — mounted at /api/v1/clinic. */
export const clinicAppRoutes = Router();
clinicAppRoutes.post(
  '/register',
  firebaseIdentity(ROLES.CLINIC),
  validate({ body: registerClinicSchema }),
  clinicController.register,
);
clinicAppRoutes.get('/me', firebaseAuth('CLINIC'), clinicController.me);
clinicAppRoutes.patch(
  '/me',
  firebaseAuth('CLINIC'),
  validate({ body: updateClinicProfileSchema }),
  clinicController.updateMe,
);

/** Patient-facing clinic discovery — mounted at /api/v1/user/clinics (Firebase USER). */
export const userClinicRoutes = Router();
userClinicRoutes.use(firebaseAuth('USER'));
userClinicRoutes.get(
  '/',
  validate({ query: listPatientClinicsQuerySchema }),
  clinicController.listForPatient,
);
userClinicRoutes.get('/:id', validate({ params: idParamSchema }), clinicController.getForPatient);
userClinicRoutes.get(
  '/:id/slots',
  validate({ params: idParamSchema, query: slotsQuerySchema }),
  clinicController.slots,
);
