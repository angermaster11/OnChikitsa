import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '../../utils/constants';
import type { JwtAccessPayload, JwtRefreshPayload } from '../../types/auth';

/**
 * Token service: signs/verifies short-lived JWT access tokens and long-lived
 * refresh tokens. Refresh tokens are opaque random strings (not the JWT that is
 * stored) — we sign a JWT wrapper carrying the DB record id (`jti`) so a refresh
 * can be located, rotated and revoked server-side.
 */
export const tokenService = {
  signAccessToken(adminId: string, role: Role): string {
    const payload: JwtAccessPayload = { sub: adminId, role, type: 'access' };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      algorithm: 'HS256',
    } as SignOptions);
  },

  signRefreshToken(adminId: string, jti: string): string {
    const payload: JwtRefreshPayload = { sub: adminId, jti, type: 'refresh' };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      algorithm: 'HS256',
    } as SignOptions);
  },

  verifyAccessToken(token: string): JwtAccessPayload {
    // Pin the algorithm so a token cannot be forced to verify under a different
    // one (defence against algorithm-confusion); our tokens are always HS256.
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as JwtAccessPayload;
    if (decoded.type !== 'access') throw new Error('Wrong token type');
    return decoded;
  },

  verifyRefreshToken(token: string): JwtRefreshPayload {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as JwtRefreshPayload;
    if (decoded.type !== 'refresh') throw new Error('Wrong token type');
    return decoded;
  },

  /** Hash a refresh token for at-rest storage (never store the raw token). */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },
};
