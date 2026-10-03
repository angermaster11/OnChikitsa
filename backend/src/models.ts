/**
 * Model barrel. Importing this module registers every Mongoose model with the
 * connection as a side effect, which is what lets `buildIndexes()` (config/database.ts)
 * iterate `mongoose.models` and create each collection's indexes on boot in
 * production (where `autoIndex` is off). Also handy as a single import point for
 * the models themselves.
 *
 * NOTE: `AppointmentCounter` (appointmentCode.ts) is intentionally omitted — it is
 * a lazily-created per-day counter whose only index is the automatic `_id`, so it
 * needs no explicit index build.
 */
export { User } from './modules/users/user.model';
export { Clinic } from './modules/clinics/clinic.model';
export { Admin } from './modules/admins/admin.model';
export { Appointment } from './modules/appointments/appointment.model';
export { Transaction } from './modules/payments/payment.model';
export { ProcessedWebhookEvent } from './modules/payments/webhookEvent.model';
export { Wallet } from './modules/wallet/wallet.model';
export { Settings } from './modules/settings/settings.model';
export { Doctor } from './modules/doctors/doctor.model';
export { Faq } from './modules/faqs/faq.model';
export { SupportTicket } from './modules/support/supportTicket.model';
export { AuditLog } from './modules/audit/auditLog.model';
export { RefreshToken } from './modules/auth/refreshToken.model';
export { Review } from './modules/reviews/review.model';
export { DeviceToken } from './modules/notifications/deviceToken.model';
export { Notification } from './modules/notifications/notification.model';
export { Broadcast } from './modules/notifications/broadcast.model';
