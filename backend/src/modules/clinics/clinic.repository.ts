import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Clinic, type ClinicDoc } from './clinic.model';
import { CLINIC_STATUS, type ClinicStatus } from '../../utils/constants';

export interface ClinicListFilters {
  search?: string;
  status?: ClinicStatus;
  from?: Date;
  to?: Date;
}

/** Patient-facing list filters (banned/deleted clinics are always excluded). */
export interface PatientClinicFilters {
  search?: string;
  specialty?: string;
  city?: string;
  /** Restrict to a specific set of clinic ids (e.g. the caller's favourites). */
  ids?: string[];
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Data-access layer for clinics. Query construction lives here, out of services. */
export const clinicRepository = {
  buildFilter(filters: ClinicListFilters): FilterQuery<ClinicDoc> {
    const query: FilterQuery<ClinicDoc> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: rx }, { phone1: rx }, { phone2: rx }, { email: rx }];
    }
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = filters.from;
      if (filters.to) query.createdAt.$lte = filters.to;
    }
    return query;
  },

  /** Filter for patient-visible clinics: never expose banned or deleted ones. */
  buildPatientFilter(filters: PatientClinicFilters): FilterQuery<ClinicDoc> {
    const query: FilterQuery<ClinicDoc> = {
      status: { $nin: [CLINIC_STATUS.BANNED, CLINIC_STATUS.DELETED] },
    };
    if (filters.specialty) {
      query.specialties = new RegExp(`^${escapeRegex(filters.specialty.trim())}$`, 'i');
    }
    // City is matched as a case-insensitive substring so a picked "Delhi" still
    // finds a clinic saved as "New Delhi" (real-world city labels are messy).
    if (filters.city) {
      query['address.city'] = new RegExp(escapeRegex(filters.city.trim()), 'i');
    }
    if (filters.search) {
      const rx = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ name: rx }, { specialties: rx }, { specification: rx }, { 'address.city': rx }];
    }
    if (filters.ids) {
      query._id = { $in: filters.ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) };
    }
    return query;
  },

  async list(
    filter: FilterQuery<ClinicDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: ClinicDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Clinic.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<ClinicDoc[]>(),
      Clinic.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string, session?: ClientSession | null): Promise<ClinicDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Clinic.findById(id).session(session ?? null).exec();
  },

  findByFirebaseUid(firebaseUid: string): Promise<ClinicDoc | null> {
    return Clinic.findOne({ firebaseUid }).exec();
  },

  create(data: Partial<ClinicDoc>): Promise<ClinicDoc> {
    return Clinic.create(data);
  },

  countByStatus(status: ClinicStatus): Promise<number> {
    return Clinic.countDocuments({ status });
  },

  count(filter: FilterQuery<ClinicDoc> = {}): Promise<number> {
    return Clinic.countDocuments(filter);
  },
};
