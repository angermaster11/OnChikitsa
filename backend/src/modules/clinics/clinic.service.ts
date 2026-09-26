import { NotFoundError, ConflictError, ForbiddenError, ERROR_CODES } from '../../utils/errors';
import { Types } from 'mongoose';
import { CLINIC_STATUS, DOCTOR_STATUS, TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { normalizeEmail, normalizePhone } from '../../utils/normalize';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { runInTransaction } from '../../utils/transaction';
import { revokeFirebaseUser } from '../../config/firebase';
import { auditService } from '../audit/audit.service';
import { clinicRepository, type ClinicListFilters } from './clinic.repository';
import { type ClinicDoc } from './clinic.model';
import { Doctor } from '../doctors/doctor.model';
import type { AuthActor } from '../../types/auth';
import type { AdminUpdateClinicBody, RegisterClinicBody } from './clinic.validation';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

/** A listed clinic enriched with a live count of its non-deleted doctors. */
export type ClinicWithDoctorsCount = ClinicDoc & { doctorsCount: number };

export const clinicService = {
  async list(
    filters: ClinicListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: ClinicWithDoctorsCount[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = clinicRepository.buildFilter(filters);
    const { items, total } = await clinicRepository.list(filter, skip, l);

    // Enrich the page with each clinic's doctor count in ONE aggregation over the
    // page's ids (avoids an N+1 count query per clinic).
    const ids = items.map((c) => c._id);
    const grouped = await Doctor.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { clinicId: { $in: ids }, status: { $ne: DOCTOR_STATUS.DELETED } } },
      { $group: { _id: '$clinicId', count: { $sum: 1 } } },
    ]);
    const countByClinic = new Map(grouped.map((g) => [String(g._id), g.count]));

    const enriched = items.map((c) => ({
      ...c,
      doctorsCount: countByClinic.get(String(c._id)) ?? 0,
    })) as ClinicWithDoctorsCount[];
    return { items: enriched, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<ClinicDoc> {
    const clinic = await clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    return clinic;
  },

  async adminUpdate(actor: AuthActor, id: string, data: AdminUpdateClinicBody, ctx: Ctx): Promise<ClinicDoc> {
    const clinic = await clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');

    if (data.name !== undefined) clinic.name = data.name;
    if (data.phone1 !== undefined) clinic.phone1 = data.phone1;
    if (data.phone2 !== undefined) clinic.phone2 = data.phone2;
    if (data.email !== undefined) clinic.email = normalizeEmail(data.email);
    if (data.yearsOld !== undefined) clinic.yearsOld = data.yearsOld;
    if (data.banner !== undefined) clinic.banner = data.banner;
    if (data.logo !== undefined) clinic.logo = data.logo;
    if (data.description !== undefined) clinic.description = data.description;
    if (data.specification !== undefined) clinic.specification = data.specification;
    if (data.specialties !== undefined) clinic.specialties = data.specialties;
    if (data.address !== undefined) clinic.address = data.address;
    if (data.location !== undefined) {
      clinic.location = data.location ? { ...data.location, updatedAt: new Date() } : null;
    }
    if (data.consultationFee !== undefined) clinic.consultationFee = data.consultationFee;
    if (data.averageConsultationTime !== undefined) clinic.averageConsultationTime = data.averageConsultationTime;
    if (data.status !== undefined) clinic.status = data.status;
    await clinic.save();

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.CLINIC_UPDATED,
      targetType: TARGET_TYPE.CLINIC,
      targetId: clinic._id,
      targetName: clinic.name,
      description: `Updated clinic ${clinic.name}`,
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return clinic;
  },

  /**
   * Ban a clinic. The status flip and the audit record are written in one
   * transaction (when the deployment supports it) so we never end up with a
   * banned clinic and no audit trail. Firebase tokens are revoked afterwards for
   * strong session invalidation.
   */
  async ban(actor: AuthActor, id: string, reason: string, ctx: Ctx): Promise<ClinicDoc> {
    const updated = await runInTransaction(async (session) => {
      const clinic = await clinicRepository.findById(id, session);
      if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
      if (clinic.status === CLINIC_STATUS.DELETED) {
        throw new ForbiddenError(ERROR_CODES.ACCOUNT_DELETED, 'Cannot ban a deleted clinic');
      }
      if (clinic.status === CLINIC_STATUS.BANNED) {
        throw new ConflictError(ERROR_CODES.ALREADY_BANNED, 'Clinic is already banned');
      }
      clinic.status = CLINIC_STATUS.BANNED;
      clinic.bannedAt = new Date();
      clinic.bannedBy = toObjectId(actor.id);
      clinic.banReason = reason;
      await clinic.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.CLINIC_BANNED,
        targetType: TARGET_TYPE.CLINIC,
        targetId: clinic._id,
        targetName: clinic.name,
        description: `Banned clinic ${clinic.name}`,
        metadata: { reason },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return clinic;
    });

    await revokeFirebaseUser(updated.firebaseUid);
    return updated;
  },
  async unban(actor: AuthActor, id: string, ctx: Ctx): Promise<ClinicDoc> {
    return runInTransaction(async (session) => {
      const clinic = await clinicRepository.findById(id, session);
      if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
      if (clinic.status !== CLINIC_STATUS.BANNED) {
        throw new ConflictError(ERROR_CODES.NOT_BANNED, 'Clinic is not banned');
      }
      clinic.status = CLINIC_STATUS.ACTIVE;
      clinic.bannedAt = null;
      clinic.bannedBy = null;
      clinic.banReason = null;
      await clinic.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.CLINIC_UNBANNED,
        targetType: TARGET_TYPE.CLINIC,
        targetId: clinic._id,
        targetName: clinic.name,
        description: `Unbanned clinic ${clinic.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return clinic;
    });
  },

  async softDelete(actor: AuthActor, id: string, ctx: Ctx): Promise<ClinicDoc> {
    return runInTransaction(async (session) => {
      const clinic = await clinicRepository.findById(id, session);
      if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
      clinic.status = CLINIC_STATUS.DELETED;
      clinic.deletedAt = new Date();
      clinic.deletedBy = toObjectId(actor.id);
      await clinic.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.CLINIC_DELETED,
        targetType: TARGET_TYPE.CLINIC,
        targetId: clinic._id,
        targetName: clinic.name,
        description: `Soft-deleted clinic ${clinic.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return clinic;
    });
  },
  // ---- App-facing (Firebase-authenticated) self operations ----

  async register(firebaseUid: string, data: RegisterClinicBody): Promise<ClinicDoc> {
    const existing = await clinicRepository.findByFirebaseUid(firebaseUid);
    if (existing) throw new ConflictError(ERROR_CODES.CONFLICT, 'Profile already exists');
    return clinicRepository.create({
      firebaseUid,
      name: data.name,
      phone1: normalizePhone(data.phone1),
      phone2: data.phone2 ? normalizePhone(data.phone2) : undefined,
      email: data.email ? normalizeEmail(data.email) : undefined,
      yearsOld: data.yearsOld,
      description: data.description,
      specification: data.specification,
      specialties: data.specialties,
      address: data.address,
      location: data.location ? { ...data.location, updatedAt: new Date() } : undefined,
      consultationFee: data.consultationFee,
      averageConsultationTime: data.averageConsultationTime,
      banner: data.banner,
      logo: data.logo,
    });
  },

  async getSelf(id: string): Promise<ClinicDoc> {
    return this.getById(id);
  },

  async updateSelf(id: string, data: AdminUpdateClinicBody): Promise<ClinicDoc> {
    const clinic = await clinicRepository.findById(id);
    if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    if (data.name !== undefined) clinic.name = data.name;
    if (data.phone1 !== undefined) clinic.phone1 = data.phone1;
    if (data.phone2 !== undefined) clinic.phone2 = data.phone2;
    if (data.email !== undefined) clinic.email = normalizeEmail(data.email);
    if (data.yearsOld !== undefined) clinic.yearsOld = data.yearsOld;
    if (data.banner !== undefined) clinic.banner = data.banner;
    if (data.logo !== undefined) clinic.logo = data.logo;
    if (data.description !== undefined) clinic.description = data.description;
    if (data.specification !== undefined) clinic.specification = data.specification;
    if (data.specialties !== undefined) clinic.specialties = data.specialties;
    if (data.address !== undefined) clinic.address = data.address;
    if (data.location !== undefined) {
      clinic.location = data.location ? { ...data.location, updatedAt: new Date() } : null;
    }
    if (data.consultationFee !== undefined) clinic.consultationFee = data.consultationFee;
    if (data.averageConsultationTime !== undefined) clinic.averageConsultationTime = data.averageConsultationTime;
    if (data.status !== undefined) clinic.status = data.status;
    await clinic.save();
    return clinic;
  },
};

function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
