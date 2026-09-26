import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { userService } from './user.service';
import type { ListUsersQuery, AdminUpdateUserBody, BanBody, RegisterUserBody, UpdateProfileBody } from './user.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const userController = {
  // ---- Admin-facing ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListUsersQuery;
    const { items, pagination } = await userService.list(
      { search: q.search, status: q.status, gender: q.gender, from: q.from, to: q.to },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getById(req.params.id);
    sendSuccess(res, user, 'User retrieved');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.adminUpdate(actor, req.params.id, req.body as AdminUpdateUserBody, ctx(req));
    sendSuccess(res, user, 'User updated');
  }),

  ban: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { reason } = req.body as BanBody;
    const user = await userService.ban(actor, req.params.id, reason, ctx(req));
    sendSuccess(res, user, 'User banned');
  }),

  unban: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.unban(actor, req.params.id, ctx(req));
    sendSuccess(res, user, 'User unbanned');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.softDelete(actor, req.params.id, ctx(req));
    sendSuccess(res, user, 'User deleted');
  }),

  // ---- App-facing (Firebase) ----
  register: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.register(actor.firebaseUid!, req.body as RegisterUserBody);
    sendSuccess(res, user, 'Profile created', 201);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.getSelf(actor.id);
    sendSuccess(res, user, 'Profile retrieved');
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const user = await userService.updateSelf(actor.id, req.body as UpdateProfileBody);
    sendSuccess(res, user, 'Profile updated');
  }),
};
