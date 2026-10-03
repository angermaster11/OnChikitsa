import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { Appointment, type AppointmentDoc } from './appointment.model';
import {
  APPOINTMENT_STATUS,
  OCCUPYING_APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from '../../utils/constants';

export interface AppointmentListFilters {
  userId?: string;
  clinicId?: string;
  date?: string;
  status?: AppointmentStatus;
}

/** Statuses that still hold a seat in a slot (everything but a cancellation). */
const OCCUPYING = OCCUPYING_APPOINTMENT_STATUSES as unknown as AppointmentStatus[];
/** Confirmed (paid/settled) seats — occupancy minus the still-pending payment hold. */
const CONFIRMED_OCCUPYING = OCCUPYING.filter(
  (s) => s !== APPOINTMENT_STATUS.PENDING_PAYMENT,
);

/**
 * Seats that count against a slot's capacity *right now*: every confirmed
 * booking, plus any PENDING_PAYMENT hold whose reservation window is still open.
 * An abandoned/expired hold stops occupying its seat automatically (no sweep
 * required), so the seat is bookable again the moment the hold lapses.
 */
function liveOccupancyMatch(now: Date = new Date()): FilterQuery<AppointmentDoc> {
  return {
    $or: [
      { status: { $in: CONFIRMED_OCCUPYING } },
      { status: APPOINTMENT_STATUS.PENDING_PAYMENT, holdExpiresAt: { $gt: now } },
    ],
  };
}

/** Data-access layer for appointments. Query construction lives here. */
export const appointmentRepository = {
  buildFilter(filters: AppointmentListFilters): FilterQuery<AppointmentDoc> {
    const query: FilterQuery<AppointmentDoc> = {};
    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.clinicId) query.clinicId = new Types.ObjectId(filters.clinicId);
    if (filters.date) query.date = filters.date;
    if (filters.status) query.status = filters.status;
    return query;
  },

  async list(
    filter: FilterQuery<AppointmentDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: AppointmentDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Appointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<AppointmentDoc[]>(),
      Appointment.countDocuments(filter),
    ]);
    return { items, total };
  },

  /** A clinic's day view: bookings ordered by day → slot → token (queue order),
   *  not the newest-first `createdAt` sort used for a patient's own bookings. */
  async listByClinicDay(
    filter: FilterQuery<AppointmentDoc>,
    skip: number,
    limit: number,
  ): Promise<{ items: AppointmentDoc[]; total: number }> {
    const [items, total] = await Promise.all([
      Appointment.find(filter).sort({ date: 1, slotStart: 1, tokenNo: 1 }).skip(skip).limit(limit).lean<AppointmentDoc[]>(),
      Appointment.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string, session?: ClientSession | null): Promise<AppointmentDoc | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Appointment.findById(id).session(session ?? null).exec();
  },

  /** Look up a booking by its human-readable code (unique partial index). */
  findByCode(appointmentCode: string, session?: ClientSession | null): Promise<AppointmentDoc | null> {
    return Appointment.findOne({ appointmentCode }).session(session ?? null).exec();
  },

  create(data: Partial<AppointmentDoc>, session?: ClientSession | null): Promise<AppointmentDoc> {
    if (session) return Appointment.create([data], { session }).then((docs) => docs[0]);
    return Appointment.create(data);
  },

  /** Number of seats already taken in one slot (live occupancy: confirmed + open holds). */
  countInSlot(
    clinicId: string,
    date: string,
    slotStart: string,
    session?: ClientSession | null,
  ): Promise<number> {
    return Appointment.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
      date,
      slotStart,
      ...liveOccupancyMatch(),
    })
      .session(session ?? null)
      .exec();
  },

  /**
   * Number of *confirmed* seats in a slot (excludes PENDING_PAYMENT holds).
   * Used to assign a token at confirmation time so unpaid/abandoned holds never
   * leave gaps in the queue numbering.
   */
  countConfirmedInSlot(
    clinicId: string,
    date: string,
    slotStart: string,
    session?: ClientSession | null,
  ): Promise<number> {
    return Appointment.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
      date,
      slotStart,
      status: { $in: CONFIRMED_OCCUPYING },
    })
      .session(session ?? null)
      .exec();
  },

  /**
   * Number of *confirmed* seats for a clinic across a whole DAY (all slots),
   * excluding PENDING_PAYMENT holds. Used to assign a per-DAY sequential token so
   * the clinic's queue is numbered 1..N across the whole day in booking order
   * (abandoned holds leave no gaps). Mirrors countConfirmedInSlot without the
   * per-slot narrowing.
   */
  countConfirmedInDay(
    clinicId: string,
    date: string,
    session?: ClientSession | null,
  ): Promise<number> {
    return Appointment.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
      date,
      status: { $in: CONFIRMED_OCCUPYING },
    })
      .session(session ?? null)
      .exec();
  },

  /** Does this patient already hold a (non-cancelled, live) seat in this exact slot? */
  findUserSlot(
    userId: string,
    clinicId: string,
    date: string,
    slotStart: string,
    session?: ClientSession | null,
  ): Promise<AppointmentDoc | null> {
    return Appointment.findOne({
      userId: new Types.ObjectId(userId),
      clinicId: new Types.ObjectId(clinicId),
      date,
      slotStart,
      ...liveOccupancyMatch(),
    })
      .session(session ?? null)
      .exec();
  },

  /**
   * The seat numbers already claimed in one slot (any row carrying a seatKey —
   * including a not-yet-swept lapsed hold, since its key still occupies the unique
   * index). Used to pick the next free seatNo for the atomic overbooking guard; the
   * unique index is the real enforcement, this just avoids obvious collisions.
   */
  async takenSeatNos(
    clinicId: string,
    date: string,
    slotStart: string,
    session?: ClientSession | null,
  ): Promise<Set<number>> {
    const rows = await Appointment.find({
      clinicId: new Types.ObjectId(clinicId),
      date,
      slotStart,
      seatKey: { $type: 'string' },
    })
      .select('seatKey')
      .session(session ?? null)
      .lean<Array<{ seatKey?: string }>>();
    const taken = new Set<number>();
    for (const r of rows) {
      const n = Number(String(r.seatKey).split(':').pop());
      if (Number.isInteger(n)) taken.add(n);
    }
    return taken;
  },

  /**
   * Release this patient's OWN PENDING_PAYMENT hold(s) in a slot (→ CANCELLED) so a
   * retry after an abandoned/failed checkout isn't blocked by their own still-live
   * hold. Confirmed bookings (BOOKED/ARRIVED/CONSULTING) are untouched — those still
   * trip the ALREADY_BOOKED guard. Returns how many holds were released.
   */
  async releaseUserHold(
    userId: string,
    clinicId: string,
    date: string,
    slotStart: string,
    session?: ClientSession | null,
  ): Promise<number> {
    const now = new Date();
    const res = await Appointment.updateMany(
      {
        userId: new Types.ObjectId(userId),
        clinicId: new Types.ObjectId(clinicId),
        date,
        slotStart,
        status: APPOINTMENT_STATUS.PENDING_PAYMENT,
      },
      { $set: { status: APPOINTMENT_STATUS.CANCELLED, cancelledAt: now, cancelledBy: 'USER', holdExpiresAt: null, seatKey: null } },
      session ? { session } : undefined,
    );
    return res.modifiedCount ?? 0;
  },

  /** Seats taken per slotStart across a whole day (live occupancy). */
  async occupancyByDate(clinicId: string, date: string): Promise<Map<string, number>> {
    const grouped = await Appointment.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          clinicId: new Types.ObjectId(clinicId),
          date,
          ...liveOccupancyMatch(),
        },
      },
      { $group: { _id: '$slotStart', count: { $sum: 1 } } },
    ]);
    return new Map(grouped.map((g) => [g._id, g.count]));
  },

  /** Total seats taken on a date across many clinics, in one aggregation. */
  async occupancyForClinicsOnDate(clinicIds: Types.ObjectId[], date: string): Promise<Map<string, number>> {
    if (clinicIds.length === 0) return new Map();
    const grouped = await Appointment.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { clinicId: { $in: clinicIds }, date, ...liveOccupancyMatch() } },
      { $group: { _id: '$clinicId', count: { $sum: 1 } } },
    ]);
    return new Map(grouped.map((g) => [String(g._id), g.count]));
  },

  /**
   * Cancel any PENDING_PAYMENT holds whose reservation window has lapsed. Seats
   * are already freed by `liveOccupancyMatch` the moment a hold expires; this is
   * housekeeping so "my bookings" doesn't show stale unpaid rows forever. Called
   * opportunistically (best-effort) — safe to run concurrently.
   */
  async expireHolds(now: Date = new Date()): Promise<number> {
    const res = await Appointment.updateMany(
      { status: APPOINTMENT_STATUS.PENDING_PAYMENT, holdExpiresAt: { $lte: now } },
      { $set: { status: APPOINTMENT_STATUS.CANCELLED, cancelledAt: now, cancelledBy: 'USER', holdExpiresAt: null, seatKey: null } },
    );
    return res.modifiedCount ?? 0;
  },
};
