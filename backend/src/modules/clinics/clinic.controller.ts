import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { clinicService } from './clinic.service';
import type { ListClinicsQuery, AdminUpdateClinicBody, BanBody, RegisterClinicBody } from './clinic.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const clinicController = {
  // ---- Admin-facing ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListClinicsQuery;
    const { items, pagination } = await clinicService.list(
      { search: q.search, status: q.status, from: q.from, to: q.to },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const clinic = await clinicService.getById(req.params.id);
    sendSuccess(res, clinic, 'Clinic retrieved');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.adminUpdate(actor, req.params.id, req.body as AdminUpdateClinicBody, ctx(req));
    sendSuccess(res, clinic, 'Clinic updated');
  }),

  ban: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { reason } = req.body as BanBody;
    const clinic = await clinicService.ban(actor, req.params.id, reason, ctx(req));
    sendSuccess(res, clinic, 'Clinic banned');
  }),

  unban: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.unban(actor, req.params.id, ctx(req));
    sendSuccess(res, clinic, 'Clinic unbanned');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.softDelete(actor, req.params.id, ctx(req));
    sendSuccess(res, clinic, 'Clinic deleted');
  }),

  // ---- App-facing (Firebase) ----
  register: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.register(actor.firebaseUid!, req.body as RegisterClinicBody);
    sendSuccess(res, clinic, 'Profile created', 201);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.getSelf(actor.id);
    sendSuccess(res, clinic, 'Profile retrieved');
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const clinic = await clinicService.updateSelf(actor.id, req.body as AdminUpdateClinicBody);
    sendSuccess(res, clinic, 'Profile updated');
  }),
};
