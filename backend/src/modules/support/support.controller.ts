import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { supportService } from './support.service';
import type { ListTicketsQuery, RespondBody, UpdateTicketBody, CreateTicketBody } from './support.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const supportController = {
  // ---- Staff-facing ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListTicketsQuery;
    const { items, pagination } = await supportService.list(
      {
        status: q.status,
        priority: q.priority,
        raisedByType: q.raisedByType,
        category: q.category,
        search: q.search,
      },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportService.getById(req.params.id);
    sendSuccess(res, ticket, 'Support ticket retrieved');
  }),

  respond: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { message } = req.body as RespondBody;
    const ticket = await supportService.respond(actor, req.params.id, message);
    sendSuccess(res, ticket, 'Response added');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const ticket = await supportService.update(actor, req.params.id, req.body as UpdateTicketBody);
    sendSuccess(res, ticket, 'Support ticket updated');
  }),

  // ---- App-facing (Firebase) ----
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const ticket = await supportService.createByApp(actor, req.body as CreateTicketBody);
    sendSuccess(res, ticket, 'Support ticket created', 201);
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListTicketsQuery;
    const { items, pagination } = await supportService.listMine(actor, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),

  /** One of the caller's own tickets (ownership enforced in the service). */
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const ticket = await supportService.getMine(actor, req.params.id);
    sendSuccess(res, ticket, 'Support ticket retrieved');
  }),

  /** Reply on one of the caller's own tickets. */
  respondMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { message } = req.body as RespondBody;
    const ticket = await supportService.respondAsRaiser(actor, req.params.id, message);
    sendSuccess(res, ticket, 'Response added');
  }),
};
