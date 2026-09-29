import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { createBookingSchema } from '../appointments/appointment.validation';
import { paymentController } from './payment.controller';
import {
  listPaymentsQuerySchema,
  listClinicPaymentsQuerySchema,
  orderIdParamSchema,
  verifyPaymentSchema,
} from './payment.validation';

/**
 * Patient payment endpoints — mounted at /api/v1/user/payments (Firebase USER).
 * Payment-first booking: POST /order creates the Razorpay order + seat hold; the app
 * opens Razorpay Checkout (native SDK on Android / checkout.js on web), then
 * POST /verify confirms the signed success. GET /status/:orderId is the authoritative
 * poll the app falls back to — the webhook may confirm the booking even if the client
 * drops before it can call /verify.
 */
export const userPaymentRoutes = Router();
userPaymentRoutes.use(firebaseAuth('USER'));

userPaymentRoutes.post('/order', validate({ body: createBookingSchema }), paymentController.createOrder);
userPaymentRoutes.post('/verify', validate({ body: verifyPaymentSchema }), paymentController.verifyPayment);
userPaymentRoutes.get(
  '/status/:orderId',
  validate({ params: orderIdParamSchema }),
  paymentController.paymentStatus,
);

/**
 * PUBLIC Razorpay webhook — mounted at /api/v1/payments/razorpay (NO auth: it is
 * verified by the raw-body HMAC against RAZORPAY_WEBHOOK_SECRET, not a JWT). The raw
 * request bytes are captured by an `express.raw` mount on this exact path in app.ts
 * (before the global JSON parser), so the controller HMACs exactly what Razorpay
 * signed. It backstops the client /verify call so a dropped client never leaves a
 * captured payment unconfirmed.
 */
export const razorpayWebhookRoutes = Router();
razorpayWebhookRoutes.post('/webhook', paymentController.razorpayWebhook);

/** Clinic earnings + own payments — mounted at /api/v1/clinic/earnings (Firebase CLINIC). */
export const clinicEarningsRoutes = Router();
clinicEarningsRoutes.use(firebaseAuth('CLINIC'));

clinicEarningsRoutes.get('/', paymentController.earnings);
clinicEarningsRoutes.get(
  '/payments',
  validate({ query: listClinicPaymentsQuerySchema }),
  paymentController.listClinicPayments,
);

/** Admin transactions (view + offline settle) — mounted at /api/v1/admin/transactions. */
export const adminTransactionRoutes = Router();
adminTransactionRoutes.use(adminAuth);

adminTransactionRoutes.get(
  '/',
  authorize(PERMISSIONS.PAYMENT_VIEW),
  validate({ query: listPaymentsQuerySchema }),
  paymentController.listPayments,
);
adminTransactionRoutes.get(
  '/:id',
  authorize(PERMISSIONS.PAYMENT_VIEW),
  validate({ params: idParamSchema }),
  paymentController.getPayment,
);
adminTransactionRoutes.post(
  '/:id/settle',
  authorize(PERMISSIONS.WALLET_SETTLE),
  validate({ params: idParamSchema }),
  paymentController.settleTransaction,
);
