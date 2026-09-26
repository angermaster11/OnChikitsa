import { Types, type FilterQuery } from 'mongoose';
import { Admin, type AdminDoc } from './admin.model';
import type { AdminStatus, Role } from '../../utils/constants';

export interface AdminListFilters {
  search?: string;
  role?: Role;
  status?: AdminStatus;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for staff (admin/support/super-admin) accounts. */
export const adminRepository = {
  buildFilter(filters: AdminListFilters): FilterQuery<AdminDoc> {
    const query: FilterQuery<AdminDoc> = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    return query;
  },

  async list(
    filter: FilterQuery<AdminDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: AdminDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Admin.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<AdminDoc[]>(),
      Admin.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string): Promise<AdminDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Admin.findById(id).exec();
  },

  findByEmail(email: string): Promise<AdminDoc | null> {
    return Admin.findOne({ email }).exec();
  },

  create(data: Partial<AdminDoc>): Promise<AdminDoc> {
    return Admin.create(data);
  },
};
