import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { reviewService } from './review.service';
import type { ListReviewsQuery, SubmitReviewBody } from './review.validation';

function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const reviewController = {
  // ---- Patient (Firebase USER) ----
  /** Create/update the caller's review for their completed appointment. */
  submit: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const review = await reviewService.createOrUpdate(
      actor.id,
      req.params.id,
      req.body as SubmitReviewBody,
    );
    sendSuccess(res, review, 'Review saved');
  }),

  /** The caller's own review for an appointment (prefill), or null. */
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const review = await reviewService.getMine(actor.id, req.params.id);
    sendSuccess(res, review, 'Review');
  }),

  /** Public (patient-facing) anonymous reviews for a clinic. */
  listForClinicPublic: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListReviewsQuery;
    const { items, pagination } = await reviewService.listForClinic(req.params.id, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),

  // ---- Clinic (Firebase CLINIC) ----
  /** The authenticated clinic's own reviews (anonymous), newest first. */
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListReviewsQuery;
    const { items, pagination } = await reviewService.listForClinic(actor.id, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),

  // ---- Admin ----
  /** Anonymous reviews for a clinic (moderation view). */
  listForAdmin: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListReviewsQuery;
    const { items, pagination } = await reviewService.listForClinic(req.params.id, q.page, q.limit);
    sendPaginated(res, items, pagination);
  }),
};
