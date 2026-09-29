import { Router } from 'express';

import { authRoutes } from '../modules/auth/auth.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { adminUserRoutes, userAppRoutes } from '../modules/users/user.routes';
import { adminClinicRoutes, clinicAppRoutes, userClinicRoutes } from '../modules/clinics/clinic.routes';
import { adminDoctorRoutes, clinicDoctorRoutes } from '../modules/doctors/doctor.routes';
import { adminFaqRoutes, userFaqRoutes } from '../modules/faqs/faq.routes';
import { adminManagementRoutes } from '../modules/admins/admin.routes';
import { adminSupportRoutes, userSupportRoutes, clinicSupportRoutes } from '../modules/support/support.routes';
import { clinicUploadRoutes } from '../modules/uploads/upload.routes';
import { auditRoutes } from '../modules/audit/audit.routes';
import { userBookingRoutes, clinicAppointmentRoutes } from '../modules/appointments/appointment.routes';
import { adminSettingsRoutes } from '../modules/settings/settings.routes';
import {
  userPaymentRoutes,
  clinicEarningsRoutes,
  adminTransactionRoutes,
  razorpayWebhookRoutes,
} from '../modules/payments/payment.routes';
import { adminWalletRoutes } from '../modules/wallet/wallet.routes';

/**
 * The single /api/v1 router. Every module exposes its own Router; this file is
 * the only place that knows the URL layout, so adding a module is a one-line
 * change here. Auth routes already carry their own `/admin/*` paths and mount at
 * the version root; everything else is mounted under an explicit prefix.
 *
 * More specific prefixes (`/user/support`, `/clinic/doctors`, `/clinic/support`)
 * are registered before their parents (`/user`, `/clinic`) so intent is obvious,
 * though each router only owns its own leaf paths and Express falls through on a
 * miss regardless.
 */
export const apiRouter = Router();

// --- Staff / admin-panel surface (JWT via adminAuth) ---
apiRouter.use('/', authRoutes); // /admin/login, /admin/refresh, /admin/logout, /admin/me
apiRouter.use('/admin/dashboard', dashboardRoutes);
apiRouter.use('/admin/users', adminUserRoutes);
apiRouter.use('/admin/clinics', adminClinicRoutes);
apiRouter.use('/admin/doctors', adminDoctorRoutes);
apiRouter.use('/admin/faqs', adminFaqRoutes);
apiRouter.use('/admin/admins', adminManagementRoutes);
apiRouter.use('/admin/support', adminSupportRoutes);
apiRouter.use('/admin/settings', adminSettingsRoutes);
apiRouter.use('/admin/transactions', adminTransactionRoutes);
apiRouter.use('/admin/wallet', adminWalletRoutes);
apiRouter.use('/admin/audit-logs', auditRoutes);

// --- App surface: patients (Firebase USER) ---
apiRouter.use('/user/support', userSupportRoutes);
apiRouter.use('/user/faqs', userFaqRoutes);
apiRouter.use('/user/clinics', userClinicRoutes);
apiRouter.use('/user/bookings', userBookingRoutes);
apiRouter.use('/user/payments', userPaymentRoutes);
apiRouter.use('/user', userAppRoutes);

// --- Razorpay webhook (PUBLIC: no JWT, verified by the raw-body HMAC signature) ---
apiRouter.use('/payments/razorpay', razorpayWebhookRoutes);

// --- App surface: clinics (Firebase CLINIC) ---
apiRouter.use('/clinic/doctors', clinicDoctorRoutes);
apiRouter.use('/clinic/appointments', clinicAppointmentRoutes);
apiRouter.use('/clinic/earnings', clinicEarningsRoutes);
apiRouter.use('/clinic/uploads', clinicUploadRoutes);
apiRouter.use('/clinic/support', clinicSupportRoutes);
apiRouter.use('/clinic', clinicAppRoutes);
