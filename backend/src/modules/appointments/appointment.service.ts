import { Types, type FilterQuery } from 'mongoose';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
  AppError,
  ERROR_CODES,
} from '../../utils/errors';
import {
  CLINIC_STATUS,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  SETTLEMENT_STATUS,
  type AppointmentStatus,
} from '../../utils/constants';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { runInTransaction } from '../../utils/transaction';
import { logger } from '../../config/logger';
import { assertRazorpayConfigured, createOrder, razorpayKeyId } from '../../config/razorpay';
import { clinicRepository } from '../clinics/clinic.repository';
import { type ClinicDoc } from '../clinics/clinic.model';
import { settingsService } from '../settings/settings.service';
import { computeBreakdown, rupeesToPaise, type PriceBreakdown } from '../payments/pricing';
import { paymentRepository } from '../payments/payment.repository';
import { paymentService } from '../payments/payment.service';
import type { TransactionDoc } from '../payments/payment.model';
import { appointmentRepository } from './appointment.repository';
import type { AppointmentDoc } from './appointment.model';
import type { CreateBookingBody } from './appointment.validation';

/** How long a PENDING_PAYMENT hold reserves its seat before the user must pay. */
const HOLD_TTL_MS = 10 * 60 * 1000;

/**
 * The handles the client needs to open Razorpay Checkout for this booking. `keyId`
 * is the publishable key (safe to ship in the app); `orderId` is the server-created
 * order that fixes the amount. On success Razorpay hands the client back a payment id
 * + signature, which the app posts to `POST /user/payments/verify`.
 */
export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
}

/**
 * What Phase A hands the client. The full amount is collected into the platform's
 * single Razorpay account; the clinic's 90% share is settled to it OFFLINE by the
 * admin (no gateway split / per-clinic payout in this build). `razorpay` carries
 * everything the app needs to open checkout; the app then confirms via /verify, and
 * falls back to polling GET /status/:orderId as the source of truth.
 */
export interface BookingOrderResult {
  appointmentId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
  breakdown: PriceBreakdown;
  holdExpiresAt: Date;
  clinic: { id: string; name: string };
  razorpay: RazorpayCheckoutParams;
}
import {
  effectiveConfig,
  windowsForDate,
  generateSlots,
  isValidDateStr,
  daysFromToday,
  todayStr,
  nowMinutes,
  hhmmToMin,
  weekdayKeyOf,
  type WeekdayKey,
  type EffectiveSlotConfig,
} from './slots';

/** Why a given date is not bookable on scheduling grounds (null = day is open). */
export type ClosedReason =
  | 'BOOKING_DISABLED'
  | 'PAST'
  | 'ADVANCE'
  | 'SAME_DAY_DISABLED'
  | 'HOLIDAY'
  | 'WEEKLY_OFF';

export interface SlotView {
  start: string;
  end: string;
  capacity: number;
  booked: number;
  available: number;
  past: boolean; // start already passed (only possible for today)
}

/** Per-slot availability for one clinic on one date (the slot-picker feed). */
export interface DayAvailability {
  date: string;
  weekday: WeekdayKey;
  open: boolean;                        // at least one slot bookable right now
  reason: ClosedReason | 'FULL' | null; // why not, when open=false
  slotDurationMin: number;
  breakBetweenSlotsMin: number;
  maxPatientsPerSlot: number;
  advanceBookingDays: number;
  sameDayBooking: boolean;
  slots: SlotView[];
}

/** Banned/deleted clinics are hidden from patients entirely. */
function isVisibleToPatients(clinic: ClinicDoc): boolean {
  return clinic.status !== CLINIC_STATUS.BANNED && clinic.status !== CLINIC_STATUS.DELETED;
}

/**
 * Decide whether a clinic accepts bookings for `date` on scheduling grounds
 * alone (ignores per-slot occupancy). Returns the blocking reason, or null when
 * the day is open. Order matters: the most fundamental block wins.
 */
function closedReasonFor(clinic: ClinicDoc, cfg: EffectiveSlotConfig, date: string): ClosedReason | null {
  if (!cfg.bookingEnabled || clinic.status !== CLINIC_STATUS.ACTIVE) return 'BOOKING_DISABLED';
  const delta = daysFromToday(date);
  if (delta < 0) return 'PAST';
  if (delta === 0 && !cfg.sameDayBooking) return 'SAME_DAY_DISABLED';
  if (delta > cfg.advanceBookingDays) return 'ADVANCE';
  if (Array.isArray(clinic.holidays) && clinic.holidays.includes(date)) return 'HOLIDAY';
  if (windowsForDate(clinic.weeklyHours, date).length === 0) return 'WEEKLY_OFF';
  return null;
}

/** Map a hard scheduling block to the error surfaced when a booking is attempted. */
function reasonToError(reason: ClosedReason): AppError {
  switch (reason) {
    case 'BOOKING_DISABLED':
      return new ForbiddenError(ERROR_CODES.BOOKING_DISABLED, 'This clinic is not accepting online bookings');
    case 'PAST':
      return new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'That date is in the past');
    case 'ADVANCE':
      return new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'That date is beyond the booking window');
    case 'SAME_DAY_DISABLED':
      return new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'Same-day booking is not available');
    case 'HOLIDAY':
      return new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'The clinic is closed on that date');
    case 'WEEKLY_OFF':
      return new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'The clinic is closed on that day');
  }
}

export const appointmentService = {
  /** Full per-slot availability for one clinic + date (the slot-picker feed). */
  async getAvailability(clinic: ClinicDoc, date: string): Promise<DayAvailability> {
    if (!isValidDateStr(date)) throw new ValidationError('Invalid date');
    // Housekeeping: flip any lapsed PENDING_PAYMENT holds to CANCELLED so an
    // abandoned checkout (payer backed out / closed the browser) doesn't linger as
    // an unactionable pending row. Best-effort — never blocks or fails the read.
    await appointmentRepository.expireHolds().catch(() => 0);
    const cfg = effectiveConfig(clinic.slotConfiguration);
    const base: DayAvailability = {
      date,
      weekday: weekdayKeyOf(date),
      open: false,
      reason: null,
      slotDurationMin: cfg.slotDurationMin,
      breakBetweenSlotsMin: cfg.breakBetweenSlotsMin,
      maxPatientsPerSlot: cfg.maxPatientsPerSlot,
      advanceBookingDays: cfg.advanceBookingDays,
      sameDayBooking: cfg.sameDayBooking,
      slots: [],
    };

    const reason = closedReasonFor(clinic, cfg, date);
    if (reason) return { ...base, reason };

    const generated = generateSlots(
      windowsForDate(clinic.weeklyHours, date),
      cfg.slotDurationMin,
      cfg.breakBetweenSlotsMin,
    );
    const occ = await appointmentRepository.occupancyByDate(String(clinic._id), date);
    const nowMin = daysFromToday(date) === 0 ? nowMinutes() : -1;

    const slots: SlotView[] = generated.map((s) => {
      const booked = occ.get(s.start) ?? 0;
      const past = hhmmToMin(s.start) <= nowMin;
      const available = past ? 0 : Math.max(0, cfg.maxPatientsPerSlot - booked);
      return { start: s.start, end: s.end, capacity: cfg.maxPatientsPerSlot, booked, available, past };
    });

    const open = slots.some((s) => s.available > 0);
    return { ...base, open, reason: open ? null : 'FULL', slots };
  },

  /**
   * Lightweight day summary for clinic list cards. Occupancy is passed in
   * (batched across the whole page by the caller) to avoid an N+1 query.
   */
  daySummary(clinic: ClinicDoc, date: string, bookedTotal: number): { open: boolean; seats: number; capacity: number } {
    const cfg = effectiveConfig(clinic.slotConfiguration);
    if (closedReasonFor(clinic, cfg, date)) return { open: false, seats: 0, capacity: 0 };
    const capacity =
      generateSlots(windowsForDate(clinic.weeklyHours, date), cfg.slotDurationMin, cfg.breakBetweenSlotsMin).length *
      cfg.maxPatientsPerSlot;
    return { open: capacity > 0, seats: Math.max(0, capacity - bookedTotal), capacity };
  },

  /** Book one slot. Validates the slot against generated availability, then
   *  claims a seat inside a transaction (occupancy re-checked to avoid races). */
  async createBooking(userId: string, body: CreateBookingBody): Promise<AppointmentDoc> {
    if (!isValidDateStr(body.date)) throw new ValidationError('Invalid date');
    const clinic = await clinicRepository.findById(body.clinicId);
    if (!clinic || !isVisibleToPatients(clinic)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }

    const availability = await this.getAvailability(clinic, body.date);
    if (availability.reason && availability.reason !== 'FULL') throw reasonToError(availability.reason);

    const slot = availability.slots.find((s) => s.start === body.slotStart && s.end === body.slotEnd);
    if (!slot || slot.past) throw new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'That time slot is not available');
    if (slot.available <= 0) throw new ConflictError(ERROR_CODES.SLOT_FULL, 'That time slot is fully booked');

    return runInTransaction(async (session) => {
      // Retry-friendly: a patient re-booking a slot they abandoned should not be
      // blocked by their OWN still-live hold. Release it first; a confirmed booking
      // still trips ALREADY_BOOKED below.
      await appointmentRepository.releaseUserHold(userId, body.clinicId, body.date, body.slotStart, session);
      const already = await appointmentRepository.findUserSlot(
        userId, body.clinicId, body.date, body.slotStart, session,
      );
      if (already) throw new ConflictError(ERROR_CODES.ALREADY_BOOKED, 'You already have a booking in this slot');

      const taken = await appointmentRepository.countInSlot(body.clinicId, body.date, body.slotStart, session);
      if (taken >= slot.capacity) throw new ConflictError(ERROR_CODES.SLOT_FULL, 'That time slot is fully booked');

      return appointmentRepository.create(
        {
          clinicId: clinic._id,
          userId: new Types.ObjectId(userId),
          date: body.date,
          slotStart: body.slotStart,
          slotEnd: body.slotEnd,
          tokenNo: taken + 1,
          status: APPOINTMENT_STATUS.BOOKED,
          patient: body.patient,
          reason: body.reason,
          clinicName: clinic.name,
          clinicArea: clinic.address?.city,
        },
        session,
      );
    });
  },

  /**
   * Phase A of payment-first booking: reserve the seat (PENDING_PAYMENT hold) and
   * create the Razorpay order. No token is assigned yet — that happens at
   * confirmation (the client /verify call or the webhook backstop). Returns
   * everything the client needs to open checkout.
   */
  async createBookingOrder(userId: string, body: CreateBookingBody): Promise<BookingOrderResult> {
    if (!isValidDateStr(body.date)) throw new ValidationError('Invalid date');

    const clinic = await clinicRepository.findById(body.clinicId);
    if (!clinic || !isVisibleToPatients(clinic)) {
      throw new NotFoundError(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    const consultationFeePaise = rupeesToPaise(clinic.consultationFee ?? 0);
    if (consultationFeePaise <= 0) {
      throw new AppError(422, ERROR_CODES.PAYMENT_ORDER_FAILED, 'This clinic has no consultation fee set');
    }

    const availability = await this.getAvailability(clinic, body.date);
    if (availability.reason && availability.reason !== 'FULL') throw reasonToError(availability.reason);
    const slot = availability.slots.find((s) => s.start === body.slotStart && s.end === body.slotEnd);
    if (!slot || slot.past) throw new ConflictError(ERROR_CODES.SLOT_UNAVAILABLE, 'That time slot is not available');
    if (slot.available <= 0) throw new ConflictError(ERROR_CODES.SLOT_FULL, 'That time slot is fully booked');

    const pricing = await settingsService.getPricing();
    const commissionPercent = clinic.commissionPercent ?? pricing.defaultCommissionPercent;
    const breakdown = computeBreakdown({
      consultationFeePaise,
      platformFeePaise: pricing.platformFeePaise,
      commissionPercent,
      gstRate: pricing.gstRate,
      gstBase: pricing.gstBase,
      currency: pricing.currency,
    });

    return this.startRazorpayOrder(userId, body, clinic, breakdown, slot.capacity);
  },

  /**
   * Atomically claim the seat behind a payment: re-check the user isn't already
   * booked here and the slot isn't full, create the PENDING_PAYMENT hold, then the
   * Transaction row (shape supplied by the caller), and link them.
   */
  async claimSeatWithPayment(
    userId: string,
    body: CreateBookingBody,
    clinic: ClinicDoc,
    slotCapacity: number,
    holdExpiresAt: Date,
    paymentData: Partial<TransactionDoc>,
  ): Promise<{ appointmentId: string; paymentId: string }> {
    return runInTransaction(async (session) => {
      // Retry-friendly: release the patient's OWN abandoned hold in this slot so a
      // re-initiated payment isn't blocked by it. Confirmed bookings still block below.
      await appointmentRepository.releaseUserHold(userId, body.clinicId, body.date, body.slotStart, session);
      const already = await appointmentRepository.findUserSlot(
        userId, body.clinicId, body.date, body.slotStart, session,
      );
      if (already) throw new ConflictError(ERROR_CODES.ALREADY_BOOKED, 'You already have a booking in this slot');

      const taken = await appointmentRepository.countInSlot(body.clinicId, body.date, body.slotStart, session);
      if (taken >= slotCapacity) throw new ConflictError(ERROR_CODES.SLOT_FULL, 'That time slot is fully booked');

      const appt = await appointmentRepository.create(
        {
          clinicId: clinic._id,
          userId: new Types.ObjectId(userId),
          date: body.date,
          slotStart: body.slotStart,
          slotEnd: body.slotEnd,
          tokenNo: 0, // assigned at confirmation
          status: APPOINTMENT_STATUS.PENDING_PAYMENT,
          patient: body.patient,
          reason: body.reason,
          clinicName: clinic.name,
          clinicArea: clinic.address?.city,
          holdExpiresAt,
        },
        session,
      );

      const payment = await paymentRepository.create(
        { ...paymentData, userId: new Types.ObjectId(userId), clinicId: clinic._id, appointmentId: appt._id },
        session,
      );

      appt.paymentId = payment._id;
      await appt.save(session ? { session } : undefined);
      return { appointmentId: String(appt._id), paymentId: String(payment._id) };
    });
  },

  /**
   * Phase A (Razorpay): create the Razorpay order FIRST (so a gateway failure never
   * leaves a dangling seat hold), then reserve the seat and persist a CREATED
   * transaction carrying the `razorpayOrderId`. Its clinic share starts PENDING
   * settlement — the platform collects the full amount and settles the clinic's 90%
   * share offline. The Transaction `_id` is pre-minted so it can be the order receipt
   * (traceable both ways) and set atomically with the seat claim.
   */
  async startRazorpayOrder(
    userId: string,
    body: CreateBookingBody,
    clinic: ClinicDoc,
    breakdown: PriceBreakdown,
    slotCapacity: number,
  ): Promise<BookingOrderResult> {
    assertRazorpayConfigured();

    const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);
    const { currency, ...snapshot } = breakdown;

    // Pre-mint the Transaction id and create the order BEFORE any DB write: if the
    // gateway call fails we throw PAYMENT_ORDER_FAILED with no seat hold left behind.
    const transactionId = new Types.ObjectId();
    const order = await createOrder({
      amountPaise: breakdown.totalPaise,
      receipt: String(transactionId),
      notes: {
        clinicId: String(clinic._id),
        clinicName: clinic.name,
        patient: body.patient.name ?? '',
      },
    });

    const { appointmentId, paymentId } = await this.claimSeatWithPayment(
      userId, body, clinic, slotCapacity, holdExpiresAt,
      {
        _id: transactionId,
        razorpayOrderId: order.id,
        status: PAYMENT_STATUS.CREATED,
        amountPaise: breakdown.totalPaise,
        currency,
        breakdown: snapshot,
        clinicName: clinic.name,
        contact: { name: body.patient.name, phone: body.patient.phone },
        settlement: {
          status: SETTLEMENT_STATUS.PENDING,
          amountPaise: breakdown.clinicAmountPaise,
        },
      },
    );

    return {
      appointmentId,
      paymentId,
      amountPaise: breakdown.totalPaise,
      currency,
      breakdown,
      holdExpiresAt,
      clinic: { id: String(clinic._id), name: clinic.name },
      razorpay: {
        keyId: razorpayKeyId(),
        orderId: order.id,
        amountPaise: order.amountPaise,
        currency: order.currency,
      },
    };
  },

  /** A patient's own bookings, newest first, optionally split upcoming/past. */
  async listMyBookings(
    userId: string,
    scope: 'upcoming' | 'past' | 'all',
    page?: number,
    limit?: number,
  ): Promise<{ items: AppointmentDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    await appointmentRepository.expireHolds().catch(() => 0); // sweep stale holds
    const today = todayStr();
    const filter: FilterQuery<AppointmentDoc> = { userId: new Types.ObjectId(userId) };
    if (scope === 'upcoming') {
      filter.date = { $gte: today };
      filter.status = {
        // PENDING_PAYMENT = a live hold whose checkout is in progress / was abandoned
        // but hasn't lapsed yet — surface it so the patient can track & finish it.
        $in: [
          APPOINTMENT_STATUS.PENDING_PAYMENT,
          APPOINTMENT_STATUS.BOOKED,
          APPOINTMENT_STATUS.ARRIVED,
          APPOINTMENT_STATUS.CONSULTING,
        ],
      };
    } else if (scope === 'past') {
      filter.$or = [
        { date: { $lt: today } },
        {
          status: {
            $in: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
          },
        },
      ];
    }
    const { items, total } = await appointmentRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  /** Patient-initiated cancellation. Only a still-BOOKED appointment can be cancelled. */
  async cancelBooking(userId: string, appointmentId: string): Promise<AppointmentDoc> {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || String(appt.userId) !== userId) {
      throw new NotFoundError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }
    if (appt.status !== APPOINTMENT_STATUS.BOOKED) {
      throw new ConflictError(ERROR_CODES.CONFLICT, 'This appointment can no longer be cancelled');
    }
    appt.status = APPOINTMENT_STATUS.CANCELLED;
    appt.cancelledAt = new Date();
    appt.cancelledBy = 'USER';
    await appt.save();

    // Mark the paid transaction REFUNDED for bookkeeping so it drops out of the
    // clinic's wallet aggregation (no gateway auto-refund in this build — the
    // platform reconciles offline). Best-effort: a failure here must not undo a
    // cancellation the patient already sees as done.
    if (appt.paymentId) {
      try {
        await paymentService.markRefundedForAppointment(appointmentId, 'user_cancelled');
      } catch (err) {
        logger.error({ err, appointmentId }, 'Marking transaction refunded on user cancellation failed');
      }
    }
    return appt;
  },

  // ---- Clinic-facing (the clinic app's own appointments) ----

  /** A clinic's own appointments, in queue order (day → slot → token). Optional
   *  single-day and single-status filters; the clinic id comes from the token. */
  async listForClinic(
    clinicId: string,
    filters: { date?: string; status?: AppointmentStatus },
    page?: number,
    limit?: number,
  ): Promise<{ items: AppointmentDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    await appointmentRepository.expireHolds().catch(() => 0); // sweep stale holds
    const filter = appointmentRepository.buildFilter({
      clinicId,
      date: filters.date,
      status: filters.status,
    });
    const { items, total } = await appointmentRepository.listByClinicDay(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  /** One appointment, scoped to the owning clinic (cross-clinic reads 404, so a
   *  clinic can never probe another clinic's bookings by id). */
  async getForClinic(clinicId: string, appointmentId: string): Promise<AppointmentDoc> {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || String(appt.clinicId) !== clinicId) {
      throw new NotFoundError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }
    return appt;
  },

  /**
   * Clinic-side status transition — arrived / consulting / completed / no-show /
   * clinic-cancel. Terminal appointments (completed, cancelled, no-show) can no
   * longer change. A clinic cancellation is recorded as cancelledBy: 'CLINIC'.
   */
  async clinicUpdateStatus(
    clinicId: string,
    appointmentId: string,
    next: AppointmentStatus,
  ): Promise<AppointmentDoc> {
    const appt = await appointmentRepository.findById(appointmentId);
    if (!appt || String(appt.clinicId) !== clinicId) {
      throw new NotFoundError(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }
    const terminal: AppointmentStatus[] = [
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED,
      APPOINTMENT_STATUS.NO_SHOW,
    ];
    if (terminal.includes(appt.status)) {
      throw new ConflictError(ERROR_CODES.CONFLICT, 'This appointment can no longer be updated');
    }
    appt.status = next;
    if (next === APPOINTMENT_STATUS.CANCELLED) {
      appt.cancelledAt = new Date();
      appt.cancelledBy = 'CLINIC';
    }
    await appt.save();

    // A clinic cancelling a paid booking marks the transaction REFUNDED for
    // bookkeeping (drops it from the wallet aggregation). Best-effort.
    if (next === APPOINTMENT_STATUS.CANCELLED && appt.paymentId) {
      try {
        await paymentService.markRefundedForAppointment(appointmentId, 'clinic_cancelled');
      } catch (err) {
        logger.error({ err, appointmentId }, 'Marking transaction refunded on clinic cancellation failed');
      }
    }
    return appt;
  },
};
