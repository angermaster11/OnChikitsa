import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Doctor, type DoctorDoc } from './doctor.model';
import { DOCTOR_STATUS, type DoctorStatus } from '../../utils/constants';

export interface DoctorListFilters {
  clinicId?: string;
  status?: DoctorStatus;
  search?: string;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for doctors. Query construction lives here, out of services. */
export const doctorRepository = {
  buildFilter(filters: DoctorListFilters): FilterQuery<DoctorDoc> {
    const query: FilterQuery<DoctorDoc> = {};
    if (filters.clinicId) query.clinicId = new Types.ObjectId(filters.clinicId);
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: rx }, { specialization: rx }, { qualification: rx }, { email: rx }];
    }
    return query;
  },

  async list(
    filter: FilterQuery<DoctorDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: DoctorDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Doctor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<DoctorDoc[]>(),
      Doctor.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string, session?: ClientSession | null): Promise<DoctorDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Doctor.findById(id).session(session ?? null).exec();
  },

  create(data: Partial<DoctorDoc>): Promise<DoctorDoc> {
    return Doctor.create(data);
  },

  countByClinic(clinicId: string): Promise<number> {
    return Doctor.countDocuments({ clinicId: new Types.ObjectId(clinicId) });
  },

  count(filter: FilterQuery<DoctorDoc> = {}): Promise<number> {
    return Doctor.countDocuments(filter);
  },

  countActive(): Promise<number> {
    return Doctor.countDocuments({ status: DOCTOR_STATUS.ACTIVE });
  },
};
