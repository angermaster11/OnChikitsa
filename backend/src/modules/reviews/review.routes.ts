import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { reviewController } from './review.controller';
import { submitReviewSchema, listReviewsQuerySchema } from './review.validation';

/**
 * Review routes. The USER per-appointment routes share the /user/bookings prefix
 * and the public clinic-reviews route shares /user/clinics; Express falls through
 * to these when the primary router has no matching leaf, so they live here (the
 * reviews module owns them) and routes/index.ts just mounts them.
 */

/** USER — per-appointment review submit/prefill. Mounted at /user/bookings. */
export const userBookingReviewRoutes = Router();
userBookingReviewRoutes.use(firebaseAuth('USER'));
userBookingReviewRoutes.post(
  '/:id/review',
  validate({ params: idParamSchema, body: submitReviewSchema }),
  reviewController.submit,
);
userBookingReviewRoutes.get('/:id/review', validate({ params: idParamSchema }), reviewController.getMine);

/** USER — public anonymous reviews for a clinic. Mounted at /user/clinics. */
export const userClinicReviewRoutes = Router();
userClinicReviewRoutes.use(firebaseAuth('USER'));
userClinicReviewRoutes.get(
  '/:id/reviews',
  validate({ params: idParamSchema, query: listReviewsQuerySchema }),
  reviewController.listForClinicPublic,
);

/** CLINIC — the authenticated clinic's own anonymous reviews. Mounted at /clinic/reviews. */
export const clinicReviewRoutes = Router();
clinicReviewRoutes.use(firebaseAuth('CLINIC'));
clinicReviewRoutes.get('/', validate({ query: listReviewsQuerySchema }), reviewController.listMine);

/** ADMIN — anonymous reviews for a clinic (moderation). Mounted at /admin/clinics. */
export const adminClinicReviewRoutes = Router();
adminClinicReviewRoutes.use(adminAuth);
adminClinicReviewRoutes.get(
  '/:id/reviews',
  authorize(PERMISSIONS.CLINIC_VIEW),
  validate({ params: idParamSchema, query: listReviewsQuerySchema }),
  reviewController.listForAdmin,
);
