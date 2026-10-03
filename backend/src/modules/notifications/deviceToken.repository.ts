import { Types } from 'mongoose';
import { DeviceToken } from './deviceToken.model';

type OwnerType = 'USER' | 'CLINIC';

const toIds = (ids: string[]) =>
  ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

/** Data access for device (FCM) tokens. */
export const deviceTokenRepository = {
  /** Register (or move) a token to this owner. Upsert by token — idempotent on re-launch. */
  async upsert(ownerType: OwnerType, ownerId: string, token: string, platform = 'android'): Promise<void> {
    if (!Types.ObjectId.isValid(ownerId)) return;
    await DeviceToken.updateOne(
      { token },
      { $set: { ownerType, ownerId: new Types.ObjectId(ownerId), platform } },
      { upsert: true },
    );
  },

  async remove(token: string): Promise<void> {
    await DeviceToken.deleteOne({ token });
  },

  /** All tokens for a set of owners (targeting a clinic's patients, etc.). */
  async tokensForOwners(ownerType: OwnerType, ownerIds: string[]): Promise<string[]> {
    const ids = toIds(ownerIds);
    if (ids.length === 0) return [];
    const rows = await DeviceToken.find({ ownerType, ownerId: { $in: ids } })
      .select('token')
      .lean<Array<{ token: string }>>();
    return rows.map((r) => r.token);
  },

  tokensForOwner(ownerType: OwnerType, ownerId: string): Promise<string[]> {
    return this.tokensForOwners(ownerType, [ownerId]);
  },

  /** Every token of an owner type (admin broadcast to all patients / all clinics). */
  async allTokens(ownerType: OwnerType): Promise<string[]> {
    const rows = await DeviceToken.find({ ownerType }).select('token').lean<Array<{ token: string }>>();
    return rows.map((r) => r.token);
  },

  /** Drop tokens FCM reported as permanently invalid. */
  async prune(tokens: string[]): Promise<void> {
    if (tokens.length) await DeviceToken.deleteMany({ token: { $in: tokens } });
  },
};
