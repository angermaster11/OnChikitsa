/**
 * Central enums / constant values shared across modules.
 * Using `as const` string enums keeps them serialisable and avoids
 * TypeScript's numeric-enum footguns while still giving us literal unions.
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  USER: 'USER',
  CLINIC: 'CLINIC',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles that authenticate through the backend (email + password + JWT). */
export const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADMIN_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;
export type AdminStatus = (typeof ADMIN_STATUS)[keyof typeof ADMIN_STATUS];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  BANNED: 'BANNED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const CLINIC_STATUS = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  BOOKING_FULL: 'BOOKING_FULL',
  BANNED: 'BANNED',
  DELETED: 'DELETED',
} as const;
export type ClinicStatus = (typeof CLINIC_STATUS)[keyof typeof CLINIC_STATUS];

export const DOCTOR_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED',
} as const;
export type DoctorStatus = (typeof DOCTOR_STATUS)[keyof typeof DOCTOR_STATUS];

/**
 * Lifecycle of a patient's appointment. PENDING_PAYMENT is the pre-booking hold
 * (a seat reserved while the user completes Razorpay Checkout); it is promoted to
 * BOOKED once payment is verified, or released (CANCELLED) when the hold expires
 * or payment fails. BOOKED → (ARRIVED → CONSULTING →) COMPLETED is the happy
 * path; CANCELLED (by patient/clinic) and NO_SHOW are the terminal exits.
 * Everything except CANCELLED occupies a slot seat (a no-show still consumed the
 * booking); CANCELLED frees the seat again. A PENDING_PAYMENT hold occupies a
 * seat only while it is still live (see OCCUPYING_APPOINTMENT_STATUSES).
 */
export const APPOINTMENT_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  BOOKED: 'BOOKED',
  ARRIVED: 'ARRIVED',
  CONSULTING: 'CONSULTING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

/**
 * Statuses that still occupy a slot seat (everything but a cancellation).
 * PENDING_PAYMENT is included so a live hold counts against capacity, but callers
 * that count occupancy additionally bound it by `holdExpiresAt > now` — an
 * abandoned hold frees its seat without a status change (a sweep flips it to
 * CANCELLED eventually).
 */
export const OCCUPYING_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.PENDING_PAYMENT,
  APPOINTMENT_STATUS.BOOKED,
  APPOINTMENT_STATUS.ARRIVED,
  APPOINTMENT_STATUS.CONSULTING,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.NO_SHOW,
] as const;

export const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof GENDER)[keyof typeof GENDER];

/** How an end-user proved their identity. Phone OTP today; Google reserved. */
export const AUTH_PROVIDER = {
  PHONE: 'PHONE',
  GOOGLE: 'GOOGLE',
} as const;
export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER];

/** Where a user is in the initial onboarding funnel. */
export const ONBOARDING_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS];

/**
 * Mirror of a device OS permission decision, so the admin panel can see the real
 * state instead of a naive boolean:
 *  - PROMPT  — never asked / can still ask (OS default)
 *  - GRANTED — the user allowed it
 *  - DENIED  — the user refused (possibly permanently); do not re-nag
 */
export const PERMISSION_STATUS = {
  PROMPT: 'PROMPT',
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
} as const;
export type PermissionStatus = (typeof PERMISSION_STATUS)[keyof typeof PERMISSION_STATUS];

export const TARGET_TYPE = {
  USER: 'USER',
  CLINIC: 'CLINIC',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  FAQ: 'FAQ',
  AUTH: 'AUTH',
  APPOINTMENT: 'APPOINTMENT',
  PAYMENT: 'PAYMENT',
  SETTINGS: 'SETTINGS',
} as const;
export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE];

/**
 * Lifecycle of a payment (Razorpay order). CREATED = order made, awaiting
 * checkout; PAID = captured + verified (the booking is confirmed); FAILED =
 * checkout failed / abandoned; REFUNDED = marked refunded for bookkeeping (the
 * platform reconciles the clinic's share offline — no gateway auto-refund here).
 */
export const PAYMENT_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Whether a clinic has been paid its share of a PAID transaction. The platform
 * collects the full amount into its single Razorpay account, then settles
 * each clinic manually/offline; the admin records that here.
 *  - PENDING (default) — the clinic's 90% share is owed but not yet paid out.
 *  - PAID              — the admin has settled this clinic's share offline.
 * Only a transaction whose payment `status` is PAID participates in settlement;
 * a clinic's wallet "pending" total sums the clinicAmountPaise of its PAID +
 * PENDING-settlement transactions.
 */
export const SETTLEMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

/**
 * Which amount GST is levied on. Consultation fee is GST-exempt (a medical
 * service), so the platform's taxable revenue is what varies:
 *  - PLATFORM_REVENUE — GST on (platform fee + clinic commission). Default.
 *  - PLATFORM_FEE     — GST on the platform fee only.
 * Stored on the pricing settings so the base can change without code edits;
 * computeBreakdown() reads it as the single source of truth.
 */
export const GST_BASE = {
  PLATFORM_REVENUE: 'PLATFORM_REVENUE',
  PLATFORM_FEE: 'PLATFORM_FEE',
} as const;
export type GstBase = (typeof GST_BASE)[keyof typeof GST_BASE];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
