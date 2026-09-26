import { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * Persisted refresh token (hashed). We store only a SHA-256 hash of the token
 * value, never the token itself, so a DB leak cannot be replayed. Rotation:
 * each use marks the old record `revoked` and issues a fresh one. Logout revokes
 * the active record. An index on `expiresAt` with TTL auto-purges stale rows.
 */
export interface RefreshTokenDoc extends Document<Types.ObjectId> {
  adminId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenId?: Types.ObjectId | null;
  createdByIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDoc>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    createdByIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ adminId: 1 });
// TTL index: MongoDB purges documents once expiresAt passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<RefreshTokenDoc> = model<RefreshTokenDoc>(
  'RefreshToken',
  refreshTokenSchema,
);
