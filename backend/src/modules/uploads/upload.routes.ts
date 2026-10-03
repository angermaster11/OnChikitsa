import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { ERROR_CODES } from '../../utils/errors';
import { sendError } from '../../utils/response';
import { uploadController } from './upload.controller';
import { uploadSignatureSchema } from './upload.validation';

/** Clinic-facing signed-upload endpoint — mounted at /api/v1/clinic/uploads.
 *  Scoped to the authenticated clinic; the API secret never leaves the server. */
export const clinicUploadRoutes = Router();
clinicUploadRoutes.use(firebaseAuth('CLINIC'));

// A tight dedicated cap: each signature lets the client push a file straight to
// Cloudinary, so an unlimited stream of signatures is a storage/bandwidth-abuse
// vector. Defined inline (not via the shared limiter module) so it is independent
// of that module and its per-instance in-memory store is fine for this coarse cap.
const uploadSignatureLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(res, 429, ERROR_CODES.RATE_LIMITED, 'Too many upload requests, please slow down'),
});

clinicUploadRoutes.post(
  '/signature',
  uploadSignatureLimiter,
  validate({ body: uploadSignatureSchema }),
  uploadController.signature,
);
