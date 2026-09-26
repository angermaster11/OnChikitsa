import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { doctorService } from './doctor.service';
import type {
  ListDoctorsQuery,
  AdminCreateDoctorBody,
  CreateDoctorBody,
  UpdateDoctorBody,
} from './doctor.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const doctorController = {
  // ---- Admin-facing ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListDoctorsQuery;
    const { items, pagination } = await doctorService.listForAdmin(
      { clinicId: q.clinicId, status: q.status, search: q.search },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const doctor = await doctorService.getById(req.params.id);
    sendSuccess(res, doctor, 'Doctor retrieved');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.adminCreate(actor, req.body as AdminCreateDoctorBody, ctx(req));
    sendSuccess(res, doctor, 'Doctor created', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.adminUpdate(actor, req.params.id, req.body as UpdateDoctorBody, ctx(req));
    sendSuccess(res, doctor, 'Doctor updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.adminDelete(actor, req.params.id, ctx(req));
    sendSuccess(res, doctor, 'Doctor deleted');
  }),

  // ---- Clinic-facing (scoped to the authenticated clinic) ----
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListDoctorsQuery;
    const { items, pagination } = await doctorService.listForClinic(
      actor.id,
      { status: q.status, search: q.search },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  createMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.clinicCreate(actor, req.body as CreateDoctorBody, ctx(req));
    sendSuccess(res, doctor, 'Doctor created', 201);
  }),

  updateMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.clinicUpdate(actor, req.params.id, req.body as UpdateDoctorBody, ctx(req));
    sendSuccess(res, doctor, 'Doctor updated');
  }),

  removeMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const doctor = await doctorService.clinicDelete(actor, req.params.id, ctx(req));
    sendSuccess(res, doctor, 'Doctor deleted');
  }),
};
