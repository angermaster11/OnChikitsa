import { NotFoundError, ConflictError, ForbiddenError, ERROR_CODES } from '../../utils/errors';
import { Types } from 'mongoose';
import {
  USER_STATUS,
  TARGET_TYPE,
  AUTH_PROVIDER,
  ONBOARDING_STATUS,
  PERMISSION_STATUS,
  CLINIC_STATUS,
} from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { normalizeEmail, normalizePhone } from '../../utils/normalize';
import { clinicRepository } from '../clinics/clinic.repository';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { runInTransaction } from '../../utils/transaction';
import { revokeFirebaseUser } from '../../config/firebase';
import { auditService } from '../audit/audit.service';
import { userRepository, type UserListFilters } from './user.repository';
import { type UserDoc } from './user.model';
import { WalletTransaction } from './walletTransaction.model';
import type { AuthActor } from '../../types/auth';
import type { AdminUpdateUserBody, RegisterUserBody, UpdateProfileBody } from './user.validation';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

export const userService = {
  async list(
    filters: UserListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: UserDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = userRepository.buildFilter(filters);
    const { items, total } = await userRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<UserDoc> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    return user;
  },

  async adminUpdate(actor: AuthActor, id: string, data: AdminUpdateUserBody, ctx: Ctx): Promise<UserDoc> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = normalizeEmail(data.email);
    if (data.gender !== undefined) user.gender = data.gender;
    if (data.dob !== undefined) user.dob = data.dob;
    if (data.height !== undefined) user.height = data.height;
    if (data.weight !== undefined) user.weight = data.weight;
    await user.save();

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.USER_UPDATED,
      targetType: TARGET_TYPE.USER,
      targetId: user._id,
      targetName: user.name,
      description: `Updated user ${user.name}`,
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return user;
  },

  async refundToWallet(id: string, amountPaise: number, description: string, ctx: Ctx = {}): Promise<void> {
    await runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
      user.walletBalancePaise = (user.walletBalancePaise || 0) + amountPaise;
      await user.save({ session: session ?? undefined });
      await WalletTransaction.create([{
        userId: user._id,
        amountPaise,
        type: 'CREDIT',
        description
      }], { session: session ?? undefined });
    }, ctx);
  },

  async fundWallet(actor: AuthActor, id: string, amountPaise: number, message?: string, ctx: Ctx = {}): Promise<{ walletBalancePaise: number; walletBalanceRupees: number; transaction: any }> {
    return runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');

      user.walletBalancePaise = (user.walletBalancePaise || 0) + amountPaise;
      await user.save({ session: session ?? undefined });

      const transaction = await WalletTransaction.create([{
        userId: user._id,
        amountPaise,
        type: 'CREDIT',
        description: message || 'Wallet funded by admin'
      }], { session: session ?? undefined });

      await auditService.recordForActor({
        actor,
        action: AUDIT_ACTIONS.USER_UPDATED,
        targetType: TARGET_TYPE.USER,
        targetId: user._id,
        targetName: user.name,
        description: `Funded wallet for user ${user.name} by ${amountPaise} paise`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session
      });

      return {
        walletBalancePaise: user.walletBalancePaise,
        walletBalanceRupees: user.walletBalancePaise / 100,
        transaction: transaction[0]
      };
    });
  },

  async debitWallet(actor: AuthActor, id: string, amountPaise: number, message?: string, ctx: Ctx = {}): Promise<{ walletBalancePaise: number; walletBalanceRupees: number; transaction: any }> {
    return runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');

      if ((user.walletBalancePaise || 0) < amountPaise) {
        throw new ConflictError(ERROR_CODES.CONFLICT, 'Insufficient wallet balance');
      }

      user.walletBalancePaise = (user.walletBalancePaise || 0) - amountPaise;
      await user.save({ session: session ?? undefined });

      const transaction = await WalletTransaction.create([{
        userId: user._id,
        amountPaise,
        type: 'DEBIT',
        description: message || 'Wallet debited by admin'
      }], { session: session ?? undefined });

      await auditService.recordForActor({
        actor,
        action: AUDIT_ACTIONS.USER_UPDATED,
        targetType: TARGET_TYPE.USER,
        targetId: user._id,
        targetName: user.name,
        description: `Debited wallet for user ${user.name} by ${amountPaise} paise`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session
      });

      return {
        walletBalancePaise: user.walletBalancePaise,
        walletBalanceRupees: user.walletBalancePaise / 100,
        transaction: transaction[0]
      };
    });
  },

  async getWalletTransactions(id: string, page?: number, limit?: number): Promise<{ items: any[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = { userId: new Types.ObjectId(id) };
    const [items, total] = await Promise.all([
      WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
      WalletTransaction.countDocuments(filter)
    ]);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  /**
   * Ban a user. The status flip and the audit record are written in one
   * transaction (when the deployment supports it) so we never end up with a
   * banned user and no audit trail. Firebase tokens are revoked afterwards for
   * strong session invalidation.
   */
  async ban(actor: AuthActor, id: string, reason: string, ctx: Ctx): Promise<UserDoc> {
    const updated = await runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
      if (user.status === USER_STATUS.DELETED) {
        throw new ForbiddenError(ERROR_CODES.ACCOUNT_DELETED, 'Cannot ban a deleted user');
      }
      if (user.status === USER_STATUS.BANNED) {
        throw new ConflictError(ERROR_CODES.ALREADY_BANNED, 'User is already banned');
      }
      user.status = USER_STATUS.BANNED;
      user.bannedAt = new Date();
      user.bannedBy = toObjectId(actor.id);
      user.banReason = reason;
      await user.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.USER_BANNED,
        targetType: TARGET_TYPE.USER,
        targetId: user._id,
        targetName: user.name,
        description: `Banned user ${user.name}`,
        metadata: { reason },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return user;
    });

    await revokeFirebaseUser(updated.firebaseUid);
    return updated;
  },

  async unban(actor: AuthActor, id: string, ctx: Ctx): Promise<UserDoc> {
    return runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
      if (user.status !== USER_STATUS.BANNED) {
        throw new ConflictError(ERROR_CODES.NOT_BANNED, 'User is not banned');
      }
      user.status = USER_STATUS.ACTIVE;
      user.bannedAt = null;
      user.bannedBy = null;
      user.banReason = null;
      await user.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.USER_UNBANNED,
        targetType: TARGET_TYPE.USER,
        targetId: user._id,
        targetName: user.name,
        description: `Unbanned user ${user.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return user;
    });
  },

  async softDelete(actor: AuthActor, id: string, ctx: Ctx): Promise<UserDoc> {
    return runInTransaction(async (session) => {
      const user = await userRepository.findById(id, session);
      if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
      user.status = USER_STATUS.DELETED;
      user.deletedAt = new Date();
      user.deletedBy = toObjectId(actor.id);
      await user.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.USER_DELETED,
        targetType: TARGET_TYPE.USER,
        targetId: user._id,
        targetName: user.name,
        description: `Soft-deleted user ${user.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return user;
    });
  },

  // ---- App-facing (Firebase-authenticated) self operations ----

  /**
   * Create the app-user profile straight after Firebase phone verification.
   * Identity (`firebaseUid`) is trusted from the verified token. Two guards keep
   * accounts unique: one per Firebase identity, one per phone number (across all
   * non-deleted accounts) so the same number can never own two live profiles.
   */
  async register(firebaseUid: string, data: RegisterUserBody): Promise<UserDoc> {
    const existing = await userRepository.findByFirebaseUid(firebaseUid);
    if (existing) throw new ConflictError(ERROR_CODES.CONFLICT, 'Profile already exists');

    const phone = normalizePhone(data.phone);
    const phoneOwner = await userRepository.findActiveByPhone(phone);
    if (phoneOwner) throw new ConflictError(ERROR_CODES.PHONE_TAKEN, 'Phone number already registered');

    return userRepository.create({
      firebaseUid,
      name: data.name,
      phone,
      gender: data.gender,
      dob: data.dob,
      email: data.email ? normalizeEmail(data.email) : undefined,
      height: data.height,
      weight: data.weight,
      authProvider: AUTH_PROVIDER.PHONE,
      onboardingStatus: ONBOARDING_STATUS.PENDING,
      notificationPermission: data.notificationPermission ?? PERMISSION_STATUS.PROMPT,
      locationPermission: data.locationPermission ?? PERMISSION_STATUS.PROMPT,
      location: data.location ? { ...data.location, updatedAt: new Date() } : null,
      lastLoginAt: new Date(),
    });
  },

  /**
   * Fetch the caller's own profile. Also used as the "does this account exist?"
   * probe right after OTP: a 200 means skip registration. Each read refreshes
   * `lastLoginAt` (login/activity) without bumping `updatedAt`, which stays
   * meaningful as "last profile edit" for the admin panel.
   */
  async getSelf(id: string): Promise<UserDoc> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });
    return user;
  },

  async updateSelf(id: string, data: UpdateProfileBody): Promise<UserDoc> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = normalizeEmail(data.email);
    if (data.gender !== undefined) user.gender = data.gender;
    if (data.dob !== undefined) user.dob = data.dob;
    if (data.height !== undefined) user.height = data.height;
    if (data.weight !== undefined) user.weight = data.weight;
    if (data.onboardingStatus !== undefined) user.onboardingStatus = data.onboardingStatus;
    if (data.notificationPermission !== undefined) user.notificationPermission = data.notificationPermission;
    if (data.locationPermission !== undefined) user.locationPermission = data.locationPermission;
    if (data.location !== undefined) user.location = { ...data.location, updatedAt: new Date() };
    await user.save();
    return user;
  },

  /** Add a clinic to the caller's favourites. Idempotent; rejects unknown/hidden clinics. */
  async addFavorite(userId: string, clinicId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const clinic = await clinicRepository.findById(clinicId);
    if (!clinic || clinic.status === CLINIC_STATUS.BANNED || clinic.status === CLINIC_STATUS.DELETED) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    if (!user.favoriteClinics.some((id) => String(id) === clinicId)) {
      user.favoriteClinics.push(new Types.ObjectId(clinicId));
      await user.save();
    }
    return user.favoriteClinics.map((id) => String(id));
  },

  /** Remove a clinic from the caller's favourites. Idempotent. */
  async removeFavorite(userId: string, clinicId: string): Promise<string[]> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    user.favoriteClinics = user.favoriteClinics.filter((id) => String(id) !== clinicId);
    await user.save();
    return user.favoriteClinics.map((id) => String(id));
  },

  /** The caller's favourite clinic ids (in insertion order). */
  async getFavoriteIds(userId: string): Promise<string[]> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    return user.favoriteClinics.map((id) => String(id));
  },
};

function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
