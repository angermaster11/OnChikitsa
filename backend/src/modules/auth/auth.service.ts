import { UnauthorizedError, ForbiddenError, ERROR_CODES } from '../../utils/errors';
import { normalizeEmail } from '../../utils/normalize';
import { ADMIN_STATUS, TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { resolvePermissions, type Permission } from '../../rbac/permissions';
import { Admin } from '../admins/admin.model';
import { auditService } from '../audit/audit.service';
import { passwordService } from './password.service';
import { tokenService } from './token.service';
import { issueRefreshToken, refreshTokenRepository } from './refreshToken.repository';
import { sanitizeAdmin, type AuthResult, type AuthTokens, type LoginInput } from './auth.types';

interface RequestCtx {
  ip?: string;
  userAgent?: string;
}

export const authService = {
  async login({ email, password, ip, userAgent }: LoginInput): Promise<AuthResult> {
    const admin = await Admin.findOne({ email: normalizeEmail(email) }).select('+passwordHash');

    // Unknown account: generic error, no audit noise, no enumeration signal.
    if (!admin) {
      logger.warn({ email: normalizeEmail(email) }, 'Login attempt for unknown account');
      throw new UnauthorizedError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Temporary lockout after too many failures.
    if (admin.lockUntil && admin.lockUntil.getTime() > Date.now()) {
      throw new UnauthorizedError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Account temporarily locked due to repeated failed logins. Try again later.',
      );
    }

    if (admin.status === ADMIN_STATUS.DISABLED) {
      throw new ForbiddenError(ERROR_CODES.ACCOUNT_DISABLED, 'This account has been disabled');
    }

    const valid = await passwordService.verify(admin.passwordHash, password);
    if (!valid) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000);
      }
      await admin.save();
      await auditService.recordSafe({
        actorId: admin._id,
        actorRole: admin.role,
        actorName: admin.name,
        actorEmail: admin.email,
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        targetType: TARGET_TYPE.AUTH,
        targetId: admin._id,
        description: `Failed login for ${admin.email}`,
        ip,
        userAgent,
      });
      throw new UnauthorizedError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Success: reset failure counters, stamp login metadata.
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLoginAt = new Date();
    if (ip) admin.lastLoginIp = ip;
    await admin.save();

    const tokens = await this.issueTokens(String(admin._id), admin.role, { ip, userAgent });
    const permissions = resolvePermissions(admin.role, admin.permissions as Permission[]);

    await auditService.recordSafe({
      actorId: admin._id,
      actorRole: admin.role,
      actorName: admin.name,
      actorEmail: admin.email,
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      targetType: TARGET_TYPE.AUTH,
      targetId: admin._id,
      description: `${admin.role} ${admin.name} logged in`,
      ip,
      userAgent,
    });

    return { admin: sanitizeAdmin(admin), permissions, ...tokens };
  },

  async issueTokens(adminId: string, role: AuthResult['admin']['role'], ctx: RequestCtx): Promise<AuthTokens> {
    const accessToken = tokenService.signAccessToken(adminId, role);
    const refreshToken = await issueRefreshToken(adminId, ctx);
    return { accessToken, refreshToken };
  },

  /**
   * Rotate a refresh token: verify the JWT, match it against the stored hash,
   * ensure it is still active, then revoke it and issue a fresh pair. Reuse of a
   * revoked token is rejected — a signal of theft.
   */
  async refresh(rawRefreshToken: string, ctx: RequestCtx): Promise<AuthTokens> {
    let payload;
    try {
      payload = tokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token');
    }

    const record = await refreshTokenRepository.findActiveById(payload.jti);
    if (
      !record ||
      record.tokenHash !== tokenService.hashToken(rawRefreshToken) ||
      String(record.adminId) !== payload.sub ||
      !refreshTokenRepository.isActive(record)
    ) {
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Refresh token is no longer valid');
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Account no longer exists');
    if (admin.status === ADMIN_STATUS.DISABLED) {
      throw new ForbiddenError(ERROR_CODES.ACCOUNT_DISABLED, 'This account has been disabled');
    }

    const accessToken = tokenService.signAccessToken(String(admin._id), admin.role);
    const newRefresh = await issueRefreshToken(String(admin._id), ctx);
    await refreshTokenRepository.revoke(record);

    return { accessToken, refreshToken: newRefresh };
  },

  /** Revoke a refresh token (logout). Best-effort: unknown tokens are ignored. */
  async logout(rawRefreshToken: string, actor: { id: string; role: AuthResult['admin']['role']; name: string; email?: string }, ctx: RequestCtx): Promise<void> {
    try {
      const payload = tokenService.verifyRefreshToken(rawRefreshToken);
      const record = await refreshTokenRepository.findActiveById(payload.jti);
      if (record && refreshTokenRepository.isActive(record)) {
        await refreshTokenRepository.revoke(record);
      }
    } catch {
      // ignore — logout is idempotent
    }
    await auditService.recordSafe({
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      actorEmail: actor.email,
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      targetType: TARGET_TYPE.AUTH,
      targetId: actor.id,
      description: `${actor.role} ${actor.name} logged out`,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  },
};
