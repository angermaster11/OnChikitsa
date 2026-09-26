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
} as const;
export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
