import { Types } from 'mongoose';
import { NotFoundError, ConflictError, ForbiddenError, ERROR_CODES } from '../../utils/errors';
import { ADMIN_STATUS, ROLES, TARGET_TYPE, type Role } from '../../utils/constants';
import { AUDIT_ACTIONS, type AuditAction } from '../../utils/auditActions';
import { normalizeEmail } from '../../utils/normalize';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { resolvePermissions, PERMISSIONS, type Permission } from '../../rbac/permissions';
import { auditService } from '../audit/audit.service';
import { refreshTokenRepository } from '../auth/refreshToken.repository';
import { passwordService } from '../auth/password.service';
import { adminRepository, type AdminListFilters } from './admin.repository';
import type { AdminDoc } from './admin.model';
import type { CreateAdminBody, UpdateAdminBody } from './admin.validation';
import type { AuthActor } from '../../types/auth';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

export interface SerializedAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: AdminDoc['status'];
  permissions: Permission[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(a: AdminDoc): SerializedAdmin {
  return {
    id: String(a._id),
    name: a.name,
    email: a.email,
    phone: a.phone,
    role: a.role,
    status: a.status,
    permissions: resolvePermissions(a.role, a.permissions as Permission[]),
    lastLoginAt: a.lastLoginAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/** Map a target role + operation to the permission required to perform it. */
function requiredPermission(role: Role, op: 'CREATE' | 'UPDATE' | 'DISABLE'): Permission {
  const isSupport = role === ROLES.SUPPORT;
  if (op === 'CREATE') return isSupport ? PERMISSIONS.SUPPORT_CREATE : PERMISSIONS.ADMIN_CREATE;
  if (op === 'UPDATE') return isSupport ? PERMISSIONS.SUPPORT_UPDATE : PERMISSIONS.ADMIN_UPDATE;
  return isSupport ? PERMISSIONS.SUPPORT_DISABLE : PERMISSIONS.ADMIN_DISABLE;
}

function assertCan(actor: AuthActor, role: Role, op: 'CREATE' | 'UPDATE' | 'DISABLE'): void {
  const perm = requiredPermission(role, op);
  if (!actor.permissions.includes(perm)) throw new ForbiddenError();
}

function auditAction(role: Role, op: 'CREATE' | 'UPDATE' | 'DISABLE'): AuditAction {
  const isSupport = role === ROLES.SUPPORT;
  if (op === 'CREATE') return isSupport ? AUDIT_ACTIONS.SUPPORT_CREATED : AUDIT_ACTIONS.ADMIN_CREATED;
  if (op === 'UPDATE') return isSupport ? AUDIT_ACTIONS.SUPPORT_UPDATED : AUDIT_ACTIONS.ADMIN_UPDATED;
  return isSupport ? AUDIT_ACTIONS.SUPPORT_DISABLED : AUDIT_ACTIONS.ADMIN_DISABLED;
}

export { serialize as serializeAdmin };

// PLACEHOLDER_APPEND

export const adminService = {
  async list(
    filters: AdminListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: SerializedAdmin[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = adminRepository.buildFilter(filters);
    const { items, total } = await adminRepository.list(filter, skip, l);
    return { items: items.map(serialize), pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<SerializedAdmin> {
    const admin = await adminRepository.findById(id);
    if (!admin) throw new NotFoundError(ERROR_CODES.ADMIN_NOT_FOUND, 'Admin not found');
    return serialize(admin);
  },

  async create(actor: AuthActor, body: CreateAdminBody, ctx: Ctx): Promise<SerializedAdmin> {
    assertCan(actor, body.role, 'CREATE');

    const email = normalizeEmail(body.email);
    if (await adminRepository.findByEmail(email)) {
      throw new ConflictError(ERROR_CODES.EMAIL_TAKEN, 'An account with this email already exists');
    }

    const passwordHash = await passwordService.hash(body.password);
    const created = await adminRepository.create({
      name: body.name,
      email,
      phone: body.phone,
      role: body.role,
      permissions: body.permissions ?? [],
      passwordHash,
      status: ADMIN_STATUS.ACTIVE,
      createdBy: new Types.ObjectId(actor.id),
    });

    await auditService.recordForActor({
      actor,
      action: auditAction(body.role, 'CREATE'),
      targetType: body.role === ROLES.SUPPORT ? TARGET_TYPE.SUPPORT : TARGET_TYPE.ADMIN,
      targetId: created._id,
      targetName: created.name,
      description: `Created ${body.role} ${created.name}`,
      metadata: { role: body.role },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return serialize(created);
  },

  async update(actor: AuthActor, id: string, body: UpdateAdminBody, ctx: Ctx): Promise<SerializedAdmin> {
    const admin = await adminRepository.findById(id);
    if (!admin) throw new NotFoundError(ERROR_CODES.ADMIN_NOT_FOUND, 'Admin not found');

    // The Super Admin account is not manageable through the normal admin APIs.
    if (admin.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError(ERROR_CODES.PROTECTED_RESOURCE, 'The Super Admin account cannot be modified here');
    }
    // Permission is checked against BOTH the current and (any) new role.
    assertCan(actor, admin.role, 'UPDATE');
    if (body.role && body.role !== admin.role) assertCan(actor, body.role, 'UPDATE');

    let passwordChanged = false;
    if (body.name !== undefined) admin.name = body.name;
    if (body.phone !== undefined) admin.phone = body.phone;
    if (body.role !== undefined) admin.role = body.role;
    if (body.permissions !== undefined) admin.permissions = body.permissions;
    if (body.status !== undefined) admin.status = body.status;
    if (body.password !== undefined) {
      admin.passwordHash = await passwordService.hash(body.password);
      passwordChanged = true;
    }
    admin.updatedBy = new Types.ObjectId(actor.id);
    await admin.save();

    await auditService.recordForActor({
      actor,
      action: auditAction(admin.role, 'UPDATE'),
      targetType: admin.role === ROLES.SUPPORT ? TARGET_TYPE.SUPPORT : TARGET_TYPE.ADMIN,
      targetId: admin._id,
      targetName: admin.name,
      description: `Updated ${admin.role} ${admin.name}`,
      metadata: { fields: Object.keys(body).filter((k) => k !== 'password'), passwordChanged },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    if (passwordChanged) {
      await refreshTokenRepository.revokeAllForAdmin(String(admin._id));
      await auditService.recordForActor({
        actor,
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        targetType: TARGET_TYPE.ADMIN,
        targetId: admin._id,
        targetName: admin.name,
        description: `Reset password for ${admin.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return serialize(admin);
  },

  async disable(actor: AuthActor, id: string, ctx: Ctx): Promise<SerializedAdmin> {
    const admin = await adminRepository.findById(id);
    if (!admin) throw new NotFoundError(ERROR_CODES.ADMIN_NOT_FOUND, 'Admin not found');
    if (admin.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError(ERROR_CODES.PROTECTED_RESOURCE, 'The Super Admin account cannot be disabled');
    }
    if (String(admin._id) === actor.id) {
      throw new ForbiddenError(ERROR_CODES.FORBIDDEN, 'You cannot disable your own account');
    }
    assertCan(actor, admin.role, 'DISABLE');

    admin.status = ADMIN_STATUS.DISABLED;
    admin.updatedBy = new Types.ObjectId(actor.id);
    await admin.save();
    // Revoke active sessions so a disabled admin is locked out immediately.
    await refreshTokenRepository.revokeAllForAdmin(String(admin._id));

    await auditService.recordForActor({
      actor,
      action: auditAction(admin.role, 'DISABLE'),
      targetType: admin.role === ROLES.SUPPORT ? TARGET_TYPE.SUPPORT : TARGET_TYPE.ADMIN,
      targetId: admin._id,
      targetName: admin.name,
      description: `Disabled ${admin.role} ${admin.name}`,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return serialize(admin);
  },
};
