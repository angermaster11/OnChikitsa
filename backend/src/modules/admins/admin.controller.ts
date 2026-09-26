import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { adminService } from './admin.service';
import type { ListAdminsQuery, CreateAdminBody, UpdateAdminBody } from './admin.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const adminController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListAdminsQuery;
    const { items, pagination } = await adminService.list(
      { search: q.search, role: q.role, status: q.status },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminService.getById(req.params.id), 'Admin retrieved');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const admin = await adminService.create(actor, req.body as CreateAdminBody, ctx(req));
    sendSuccess(res, admin, 'Admin created', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const admin = await adminService.update(actor, req.params.id, req.body as UpdateAdminBody, ctx(req));
    sendSuccess(res, admin, 'Admin updated');
  }),

  disable: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const admin = await adminService.disable(actor, req.params.id, ctx(req));
    sendSuccess(res, admin, 'Admin disabled');
  }),
};
