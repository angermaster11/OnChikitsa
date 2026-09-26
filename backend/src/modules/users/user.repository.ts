import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { User, type UserDoc } from './user.model';
import { USER_STATUS, type Gender, type UserStatus } from '../../utils/constants';

export interface UserListFilters {
  search?: string;
  status?: UserStatus;
  gender?: Gender;
  from?: Date;
  to?: Date;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for users. Query construction lives here, out of services. */
export const userRepository = {
  buildFilter(filters: UserListFilters): FilterQuery<UserDoc> {
    const query: FilterQuery<UserDoc> = {};
    if (filters.status) query.status = filters.status;
    if (filters.gender) query.gender = filters.gender;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = filters.from;
      if (filters.to) query.createdAt.$lte = filters.to;
    }
    return query;
  },

  async list(
    filter: FilterQuery<UserDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: UserDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<UserDoc[]>(),
      User.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string, session?: ClientSession | null): Promise<UserDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findById(id).session(session ?? null).exec();
  },

  findByFirebaseUid(firebaseUid: string): Promise<UserDoc | null> {
    return User.findOne({ firebaseUid }).exec();
  },

  /** Owner of a phone number among non-deleted accounts — backs the
   *  application-level phone-uniqueness guard at registration. */
  findActiveByPhone(phone: string, session?: ClientSession | null): Promise<UserDoc | null> {
    return User.findOne({ phone, status: { $ne: USER_STATUS.DELETED } })
      .session(session ?? null)
      .exec();
  },

  create(data: Partial<UserDoc>): Promise<UserDoc> {
    return User.create(data);
  },

  countByStatus(status: UserStatus): Promise<number> {
    return User.countDocuments({ status });
  },

  count(filter: FilterQuery<UserDoc> = {}): Promise<number> {
    return User.countDocuments(filter);
  },
};
