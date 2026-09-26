import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, ERROR_CODES } from '../utils/errors';
import { getBearerToken } from '../utils/http';
import { ADMIN_STATUS } from '../utils/constants';
import { resolvePermissions, type Permission } from '../rbac/permissions';
import { tokenService } from '../modules/auth/token.service';
import { Admin } from '../modules/admins/admin.model';
import type { AuthActor } from '../types/auth';

/**
 * Authenticate a STAFF request (SUPER_ADMIN / ADMIN / SUPPORT) from a JWT access
 * token. The token alone is NOT trusted for authorization state — we re-load the
 * Admin record on every request so a just-disabled account is rejected
 * immediately, and we resolve permissions from the DB, never from the client.
 */
export async function adminAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) throw new UnauthorizedError();

    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired access token');
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Account no longer exists');
    if (admin.status === ADMIN_STATUS.DISABLED) {
      throw new ForbiddenError(ERROR_CODES.ACCOUNT_DISABLED, 'This account has been disabled');
    }

    const actor: AuthActor = {
      kind: 'STAFF',
      id: String(admin._id),
      role: admin.role,
      name: admin.name,
      email: admin.email,
      permissions: resolvePermissions(admin.role, admin.permissions as Permission[]),
    };
    req.actor = actor;
    next();
  } catch (err) {
    next(err);
  }
}
