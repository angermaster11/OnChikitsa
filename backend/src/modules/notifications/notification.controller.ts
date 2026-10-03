import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { notificationService } from './notification.service';
import type { ListNotificationsQuery, BroadcastBody } from './notification.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const notificationController = {
  /** GET /user/notifications — the caller's feed (events + broadcasts). */
  feed: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListNotificationsQuery;
    const { items, pagination } = await notificationService.listForUser(actor.id, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),

  /** POST /admin/notifications — send a broadcast to the chosen audience. */
  send: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const body = req.body as BroadcastBody;
    const { broadcast, sentCount } = await notificationService.sendBroadcast(actor, body);
    sendSuccess(res, { broadcast, sentCount }, 'Notification sent', 201);
  }),

  /** GET /admin/notifications — broadcast history. */
  history: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListNotificationsQuery;
    const { items, pagination } = await notificationService.listBroadcasts(q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),
};
