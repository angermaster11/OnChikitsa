import { NotFoundError, ForbiddenError, ERROR_CODES } from '../../utils/errors';
import { Types } from 'mongoose';
import { DOCTOR_STATUS, TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { normalizeEmail, normalizePhone } from '../../utils/normalize';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { runInTransaction } from '../../utils/transaction';
import { auditService } from '../audit/audit.service';
import { doctorRepository, type DoctorListFilters } from './doctor.repository';
import { type DoctorDoc } from './doctor.model';
import { Clinic } from '../clinics/clinic.model';
import type { AuthActor } from '../../types/auth';
import type { AdminCreateDoctorBody, CreateDoctorBody, UpdateDoctorBody } from './doctor.validation';

interface Ctx {
  ip?: string;
  userAgent?: string;
}

export const doctorService = {
  // ---- Admin-facing ----
  async listForAdmin(
    filters: DoctorListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: DoctorDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = doctorRepository.buildFilter(filters);
    const { items, total } = await doctorRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<DoctorDoc> {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new NotFoundError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
    return doctor;
  },

  async adminCreate(actor: AuthActor, data: AdminCreateDoctorBody, ctx: Ctx): Promise<DoctorDoc> {
    const clinic = await Clinic.findById(data.clinicId);
    if (!clinic) throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');

    const doctor = await doctorRepository.create({
      clinicId: toObjectId(data.clinicId),
      name: data.name,
      qualification: data.qualification,
      specialization: data.specialization,
      age: data.age,
      gender: data.gender,
      email: data.email ? normalizeEmail(data.email) : undefined,
      phone: data.phone ? normalizePhone(data.phone) : undefined,
      photo: data.photo,
      experience: data.experience,
      registrationNo: data.registrationNo,
      consultationFee: data.consultationFee,
    });

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.DOCTOR_CREATED,
      targetType: TARGET_TYPE.DOCTOR,
      targetId: doctor._id,
      targetName: doctor.name,
      description: `Created doctor ${doctor.name}`,
      metadata: { clinicId: data.clinicId },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return doctor;
  },
  async adminUpdate(actor: AuthActor, id: string, data: UpdateDoctorBody, ctx: Ctx): Promise<DoctorDoc> {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new NotFoundError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
    applyDoctorFields(doctor, data);
    await doctor.save();

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.DOCTOR_UPDATED,
      targetType: TARGET_TYPE.DOCTOR,
      targetId: doctor._id,
      targetName: doctor.name,
      description: `Updated doctor ${doctor.name}`,
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return doctor;
  },

  async adminDelete(actor: AuthActor, id: string, ctx: Ctx): Promise<DoctorDoc> {
    return runInTransaction(async (session) => {
      const doctor = await doctorRepository.findById(id, session);
      if (!doctor) throw new NotFoundError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
      doctor.status = DOCTOR_STATUS.DELETED;
      doctor.deletedAt = new Date();
      doctor.deletedBy = toObjectId(actor.id);
      await doctor.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.DOCTOR_DELETED,
        targetType: TARGET_TYPE.DOCTOR,
        targetId: doctor._id,
        targetName: doctor.name,
        description: `Soft-deleted doctor ${doctor.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return doctor;
    });
  },

  // ---- Clinic-facing (scoped to the authenticated clinic) ----
  async listForClinic(
    clinicId: string,
    filters: DoctorListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: DoctorDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = doctorRepository.buildFilter({ ...filters, clinicId });
    // Clinics never see soft-deleted doctors unless they explicitly ask by status.
    if (!filters.status) filter.status = { $ne: DOCTOR_STATUS.DELETED };
    const { items, total } = await doctorRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async clinicCreate(actor: AuthActor, data: CreateDoctorBody, ctx: Ctx): Promise<DoctorDoc> {
    const doctor = await doctorRepository.create({
      clinicId: toObjectId(actor.id),
      name: data.name,
      qualification: data.qualification,
      specialization: data.specialization,
      age: data.age,
      gender: data.gender,
      email: data.email ? normalizeEmail(data.email) : undefined,
      phone: data.phone ? normalizePhone(data.phone) : undefined,
      photo: data.photo,
      experience: data.experience,
      registrationNo: data.registrationNo,
      consultationFee: data.consultationFee,
    });

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.DOCTOR_CREATED,
      targetType: TARGET_TYPE.DOCTOR,
      targetId: doctor._id,
      targetName: doctor.name,
      description: `Created doctor ${doctor.name}`,
      metadata: { clinicId: actor.id },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return doctor;
  },

  async clinicUpdate(actor: AuthActor, id: string, data: UpdateDoctorBody, ctx: Ctx): Promise<DoctorDoc> {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) throw new NotFoundError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
    if (String(doctor.clinicId) !== actor.id) throw new ForbiddenError();
    applyDoctorFields(doctor, data);
    await doctor.save();

    await auditService.recordForActor({
      actor,
      action: AUDIT_ACTIONS.DOCTOR_UPDATED,
      targetType: TARGET_TYPE.DOCTOR,
      targetId: doctor._id,
      targetName: doctor.name,
      description: `Updated doctor ${doctor.name}`,
      metadata: { fields: Object.keys(data) },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return doctor;
  },

  async clinicDelete(actor: AuthActor, id: string, ctx: Ctx): Promise<DoctorDoc> {
    return runInTransaction(async (session) => {
      const doctor = await doctorRepository.findById(id, session);
      if (!doctor) throw new NotFoundError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
      if (String(doctor.clinicId) !== actor.id) throw new ForbiddenError();
      doctor.status = DOCTOR_STATUS.DELETED;
      doctor.deletedAt = new Date();
      doctor.deletedBy = toObjectId(actor.id);
      await doctor.save({ session: session ?? undefined });

      await auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        actorEmail: actor.email,
        action: AUDIT_ACTIONS.DOCTOR_DELETED,
        targetType: TARGET_TYPE.DOCTOR,
        targetId: doctor._id,
        targetName: doctor.name,
        description: `Soft-deleted doctor ${doctor.name}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        session,
      });
      return doctor;
    });
  },
};

function toObjectId(id: string) {
  return new Types.ObjectId(id);
}

function applyDoctorFields(doctor: DoctorDoc, data: UpdateDoctorBody): void {
  if (data.name !== undefined) doctor.name = data.name;
  if (data.qualification !== undefined) doctor.qualification = data.qualification;
  if (data.specialization !== undefined) doctor.specialization = data.specialization;
  if (data.age !== undefined) doctor.age = data.age;
  if (data.gender !== undefined) doctor.gender = data.gender;
  if (data.email !== undefined) doctor.email = normalizeEmail(data.email);
  if (data.phone !== undefined) doctor.phone = normalizePhone(data.phone);
  if (data.photo !== undefined) doctor.photo = data.photo;
  if (data.experience !== undefined) doctor.experience = data.experience;
  if (data.registrationNo !== undefined) doctor.registrationNo = data.registrationNo;
  if (data.consultationFee !== undefined) doctor.consultationFee = data.consultationFee;
  if (data.status !== undefined) doctor.status = data.status;
}
