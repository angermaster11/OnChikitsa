import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { doctorController } from './doctor.controller';
import {
  listDoctorsQuerySchema,
  adminCreateDoctorSchema,
  createDoctorSchema,
  updateDoctorSchema,
} from './doctor.validation';

/** Admin-facing doctor management — mounted at /api/v1/admin/doctors. */
export const adminDoctorRoutes = Router();
adminDoctorRoutes.use(adminAuth);

adminDoctorRoutes.get(
  '/',
  authorize(PERMISSIONS.DOCTOR_VIEW),
  validate({ query: listDoctorsQuerySchema }),
  doctorController.list,
);
adminDoctorRoutes.get(
  '/:id',
  authorize(PERMISSIONS.DOCTOR_VIEW),
  validate({ params: idParamSchema }),
  doctorController.getById,
);
adminDoctorRoutes.post(
  '/',
  authorize(PERMISSIONS.DOCTOR_CREATE),
  validate({ body: adminCreateDoctorSchema }),
  doctorController.create,
);
adminDoctorRoutes.patch(
  '/:id',
  authorize(PERMISSIONS.DOCTOR_UPDATE),
  validate({ params: idParamSchema, body: updateDoctorSchema }),
  doctorController.update,
);
adminDoctorRoutes.delete(
  '/:id',
  authorize(PERMISSIONS.DOCTOR_DELETE),
  validate({ params: idParamSchema }),
  doctorController.remove,
);

/** Clinic-facing doctor management — mounted at /api/v1/clinic/doctors. Every
 *  route is scoped to the authenticated clinic. */
export const clinicDoctorRoutes = Router();
clinicDoctorRoutes.use(firebaseAuth('CLINIC'));

clinicDoctorRoutes.get('/', validate({ query: listDoctorsQuerySchema }), doctorController.listMine);
clinicDoctorRoutes.post('/', validate({ body: createDoctorSchema }), doctorController.createMine);
clinicDoctorRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateDoctorSchema }),
  doctorController.updateMine,
);
clinicDoctorRoutes.delete('/:id', validate({ params: idParamSchema }), doctorController.removeMine);
