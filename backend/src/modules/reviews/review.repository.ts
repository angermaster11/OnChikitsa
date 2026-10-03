import { Types, type ClientSession } from 'mongoose';
import { Review, type ReviewDoc } from './review.model';
import { Clinic } from '../clinics/clinic.model';

/** The fields exposed in an anonymous review (NEVER userId / appointmentId). */
const ANON_FIELDS = 'rating comment createdAt' as const;

/** Data access for reviews. Anonymous projection is enforced here for list reads. */
export const reviewRepository = {
  findByAppointment(
    appointmentId: string,
    session?: ClientSession | null,
  ): Promise<ReviewDoc | null> {
    if (!Types.ObjectId.isValid(appointmentId)) return Promise.resolve(null);
    return Review.findOne({ appointmentId: new Types.ObjectId(appointmentId) })
      .session(session ?? null)
      .exec();
  },

  create(data: Partial<ReviewDoc>, session?: ClientSession | null): Promise<ReviewDoc> {
    if (session) return Review.create([data], { session }).then((docs) => docs[0]);
    return Review.create(data);
  },

  /** A clinic's reviews, newest first — ANONYMOUS projection (no patient identity). */
  async listByClinic(
    clinicId: string,
    skip: number,
    limit: number,
  ): Promise<{ items: Array<Pick<ReviewDoc, 'rating' | 'comment' | 'createdAt'>>; total: number }> {
    if (!Types.ObjectId.isValid(clinicId)) return { items: [], total: 0 };
    const filter = { clinicId: new Types.ObjectId(clinicId) };
    const [items, total] = await Promise.all([
      Review.find(filter)
        .select(ANON_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Array<Pick<ReviewDoc, 'rating' | 'comment' | 'createdAt'>>>(),
      Review.countDocuments(filter),
    ]);
    return { items, total };
  },

  /**
   * Atomically fold a rating change into the clinic's denormalized aggregate: adjust
   * ratingSum/ratingCount by the given deltas, then recompute ratingAvg from the
   * updated values — all in one pipeline update (atomic on every topology, so a
   * standalone mongod without transactions is still safe). No read-modify-write race.
   */
  applyClinicRatingDelta(
    clinicId: Types.ObjectId,
    sumDelta: number,
    countDelta: number,
    session?: ClientSession | null,
  ): Promise<unknown> {
    return Clinic.updateOne(
      { _id: clinicId },
      [
        {
          $set: {
            ratingSum: { $add: [{ $ifNull: ['$ratingSum', 0] }, sumDelta] },
            ratingCount: { $add: [{ $ifNull: ['$ratingCount', 0] }, countDelta] },
          },
        },
        {
          $set: {
            ratingAvg: {
              $cond: [
                { $gt: ['$ratingCount', 0] },
                { $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 1] },
                0,
              ],
            },
          },
        },
      ],
      session ? { session } : {},
    ).exec();
  },
};
