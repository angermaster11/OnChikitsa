import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { uploadController } from './upload.controller';
import { uploadSignatureSchema } from './upload.validation';

/** Clinic-facing signed-upload endpoint — mounted at /api/v1/clinic/uploads.
 *  Scoped to the authenticated clinic; the API secret never leaves the server. */
export const clinicUploadRoutes = Router();
clinicUploadRoutes.use(firebaseAuth('CLINIC'));

clinicUploadRoutes.post('/signature', validate({ body: uploadSignatureSchema }), uploadController.signature);
