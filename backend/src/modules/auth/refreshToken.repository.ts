import { Types, type ClientSession } from 'mongoose';
import jwt from 'jsonwebtoken';
import { RefreshToken, type RefreshTokenDoc } from './refreshToken.model';
import { tokenService } from './token.service';

/**
 * Issue a refresh token: create the DB record first (to get its id → `jti`),
 * sign a JWT carrying that jti, store the token's hash, and return the raw
 * token to hand to the client. The raw token is never persisted.
 */
export async function issueRefreshToken(
  adminId: string,
  ctx: { ip?: string; userAgent?: string },
  session?: ClientSession | null,
): Promise<string> {
  const [record] = await RefreshToken.create(
    [{ adminId: new Types.ObjectId(adminId), tokenHash: 'pending', expiresAt: new Date() }],
    session ? { session } : {},
  );
  const jti = String(record!._id);
  const raw = tokenService.signRefreshToken(adminId, jti);
  const decoded = jwt.decode(raw) as { exp?: number } | null;
  record!.tokenHash = tokenService.hashToken(raw);
  record!.expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 864e5);
  if (ctx.ip) record!.createdByIp = ctx.ip;
  if (ctx.userAgent) record!.userAgent = ctx.userAgent;
  await record!.save(session ? { session } : {});
  return raw;
}

export const refreshTokenRepository = {
  findActiveById(jti: string): Promise<RefreshTokenDoc | null> {
    if (!Types.ObjectId.isValid(jti)) return Promise.resolve(null);
    return RefreshToken.findById(jti).exec();
  },
  async revoke(record: RefreshTokenDoc, replacedBy?: string): Promise<void> {
    record.revokedAt = new Date();
    if (replacedBy) record.replacedByTokenId = new Types.ObjectId(replacedBy);
    await record.save();
  },
  async revokeAllForAdmin(adminId: string): Promise<void> {
    await RefreshToken.updateMany(
      { adminId: new Types.ObjectId(adminId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  },
  isActive(record: RefreshTokenDoc): boolean {
    return !record.revokedAt && record.expiresAt.getTime() > Date.now();
  },
};
