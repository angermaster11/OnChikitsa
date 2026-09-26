import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { faqService } from './faq.service';
import type { ListFaqsQuery, CreateFaqBody, UpdateFaqBody } from './faq.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const faqController = {
  // ---- App-facing (Firebase USER): read-only list of active FAQs ----
  listActive: asyncHandler(async (_req: Request, res: Response) => {
    const items = await faqService.listActive();
    sendSuccess(res, items, 'FAQs retrieved');
  }),

  // ---- Admin-facing ----
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListFaqsQuery;
    const { items, pagination } = await faqService.listForAdmin(
      { isActive: q.isActive, search: q.search },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const faq = await faqService.getById(req.params.id);
    sendSuccess(res, faq, 'FAQ retrieved');
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const faq = await faqService.create(actor, req.body as CreateFaqBody, ctx(req));
    sendSuccess(res, faq, 'FAQ created', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const faq = await faqService.update(actor, req.params.id, req.body as UpdateFaqBody, ctx(req));
    sendSuccess(res, faq, 'FAQ updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const faq = await faqService.remove(actor, req.params.id, ctx(req));
    sendSuccess(res, faq, 'FAQ deleted');
  }),
};
