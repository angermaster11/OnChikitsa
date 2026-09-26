import type { AdminDoc } from '../admins/admin.model';
import type { Permission } from '../../rbac/permissions';

export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  admin: SanitizedAdmin;
  permissions: Permission[];
}

export interface SanitizedAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminDoc['role'];
  status: AdminDoc['status'];
  lastLoginAt?: Date;
}

export function sanitizeAdmin(admin: AdminDoc): SanitizedAdmin {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt,
  };
}
