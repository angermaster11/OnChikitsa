/**
 * Permission catalogue + role→permission mapping.
 *
 * Authorization is PERMISSION-based, never role-string based. Middleware checks
 * for specific permissions; roles are merely bundles of permissions. This lets
 * us grant a Support user a single extra capability without turning them into
 * an Admin, and keeps the backend the single source of truth for what each
 * actor may do.
 */
import { ROLES, type Role } from '../utils/constants';

export const PERMISSIONS = {
  USER_VIEW: 'USER_VIEW',
  USER_UPDATE: 'USER_UPDATE',
  USER_BAN: 'USER_BAN',
  USER_UNBAN: 'USER_UNBAN',
  USER_DELETE: 'USER_DELETE',

  CLINIC_VIEW: 'CLINIC_VIEW',
  CLINIC_UPDATE: 'CLINIC_UPDATE',
  CLINIC_BAN: 'CLINIC_BAN',
  CLINIC_UNBAN: 'CLINIC_UNBAN',
  CLINIC_DELETE: 'CLINIC_DELETE',

  DOCTOR_VIEW: 'DOCTOR_VIEW',
  DOCTOR_CREATE: 'DOCTOR_CREATE',
  DOCTOR_UPDATE: 'DOCTOR_UPDATE',
  DOCTOR_DELETE: 'DOCTOR_DELETE',

  ADMIN_VIEW: 'ADMIN_VIEW',
  ADMIN_CREATE: 'ADMIN_CREATE',
  ADMIN_UPDATE: 'ADMIN_UPDATE',
  ADMIN_DISABLE: 'ADMIN_DISABLE',

  SUPPORT_VIEW: 'SUPPORT_VIEW',
  SUPPORT_CREATE: 'SUPPORT_CREATE',
  SUPPORT_UPDATE: 'SUPPORT_UPDATE',
  SUPPORT_DISABLE: 'SUPPORT_DISABLE',

  FAQ_VIEW: 'FAQ_VIEW',
  FAQ_CREATE: 'FAQ_CREATE',
  FAQ_UPDATE: 'FAQ_UPDATE',
  FAQ_DELETE: 'FAQ_DELETE',

  AUDIT_LOG_VIEW: 'AUDIT_LOG_VIEW',
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * Default permission set per role. SUPER_ADMIN implicitly has every permission.
 * An individual Admin/Support record may carry an explicit `permissions` array
 * that overrides these defaults (see resolvePermissions).
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,

  [ROLES.ADMIN]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_UNBAN,
    PERMISSIONS.CLINIC_VIEW,
    PERMISSIONS.CLINIC_UPDATE,
    PERMISSIONS.CLINIC_BAN,
    PERMISSIONS.CLINIC_UNBAN,
    PERMISSIONS.DOCTOR_VIEW,
    PERMISSIONS.FAQ_VIEW,
    PERMISSIONS.FAQ_CREATE,
    PERMISSIONS.FAQ_UPDATE,
    PERMISSIONS.FAQ_DELETE,
    PERMISSIONS.AUDIT_LOG_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  // Support gets read-only visibility by default; extra powers must be granted
  // explicitly on the individual account.
  [ROLES.SUPPORT]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CLINIC_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  // App roles hold no admin-panel permissions.
  [ROLES.USER]: [],
  [ROLES.CLINIC]: [],
};

/**
 * Resolve the effective permission set for a staff account. SUPER_ADMIN always
 * has all permissions regardless of stored overrides. For ADMIN/SUPPORT, an
 * explicit non-empty `explicit` list (stored on the record) takes precedence
 * over the role defaults, enabling least-privilege customisation.
 */
export function resolvePermissions(role: Role, explicit?: Permission[]): Permission[] {
  if (role === ROLES.SUPER_ADMIN) return ALL_PERMISSIONS;
  if (explicit && explicit.length > 0) return explicit;
  return ROLE_PERMISSIONS[role] ?? [];
}

export function isValidPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
