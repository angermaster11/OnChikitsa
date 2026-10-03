import { Types } from 'mongoose';
import { NotFoundError, ConflictError, ERROR_CODES } from '../../utils/errors';
import { APPOINTMENT_STATUS } from '../../utils/constants';
import { runInTransaction } from '../../utils/transaction';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { appointmentRepository } from '../appointments/appointment.repository';
import { reviewRepository } from './review.repository';
import type { SubmitReviewBody } from './review.validation';

/** The anonymous shape returned to every client (never userId / appointmentId). */
export interface AnonReview {
  rating: number;
  comment: string | null;
  createdAt: Date;
}

/** The caller's own review (returned on submit / prefill); still omits userId. */
export interface OwnReview extends AnonReview {
  id: string;
}

export const reviewService = {
  /**
   * Create or update the caller's review for one of THEIR completed appointments.
   * One review per appointment; a re-submit edits it. The clinic's denormalized
   * rating aggregate is folded in atomically in the same transaction.
   */
  async createOrUpdate(userId: string, appointmentId: string, body: SubmitReviewBody): Promise<OwnReview> {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || String(appt.userId) !== userId) {
      throw new NotFoundError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }
    if (appt.status !== APPOINTMENT_STATUS.COMPLETED) {
      throw new ConflictError(ERROR_CODES.CONFLICT, 'You can only review a completed visit');
    }
    const comment = body.comment ?? null;

    return runInTransaction(async (session) => {
      const existing = await reviewRepository.findByAppointment(appointmentId, session);
      if (existing) {
        const delta = body.rating - existing.rating;
        existing.rating = body.rating;
        existing.comment = comment;
        await existing.save(session ? { session } : undefined);
        if (delta !== 0) await reviewRepository.applyClinicRatingDelta(appt.clinicId, delta, 0, session);
        return shapeOwn(existing);
      }
      const review = await reviewRepository.create(
        {
          appointmentId: appt._id,
          clinicId: appt.clinicId,
          userId: new Types.ObjectId(userId),
          rating: body.rating,
          comment,
        },
        session,
      );
      await reviewRepository.applyClinicRatingDelta(appt.clinicId, body.rating, 1, session);
      return shapeOwn(review);
    });
  },

  /** The caller's own review for an appointment (to prefill the edit form), or null. */
  async getMine(userId: string, appointmentId: string): Promise<OwnReview | null> {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || String(appt.userId) !== userId) {
      throw new NotFoundError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }
    const review = await reviewRepository.findByAppointment(appointmentId);
    return review ? shapeOwn(review) : null;
  },

  /** A clinic's reviews, newest first — ANONYMOUS. Shared by the clinic app, the
   *  admin panel and the public clinic view. */
  async listForClinic(
    clinicId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: AnonReview[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const { items, total } = await reviewRepository.listByClinic(clinicId, skip, l);
    const anon: AnonReview[] = items.map((r) => ({
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt,
    }));
    return { items: anon, pagination: buildPaginationMeta(p, l, total) };
  },
};

function shapeOwn(r: { _id: Types.ObjectId; rating: number; comment?: string | null; createdAt: Date }): OwnReview {
  return { id: String(r._id), rating: r.rating, comment: r.comment ?? null, createdAt: r.createdAt };
}
