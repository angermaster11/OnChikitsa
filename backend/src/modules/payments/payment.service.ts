import { AppError, NotFoundError, ERROR_CODES } from '../../utils/errors';
import { APPOINTMENT_STATUS, PAYMENT_STATUS, type PaymentStatus } from '../../utils/constants';
import { logger } from '../../config/logger';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { runInTransaction } from '../../utils/transaction';
import { verifyPaymentSignature, verifyWebhookSignature } from '../../config/razorpay';
import type { AppointmentDoc } from '../appointments/appointment.model';
import { appointmentRepository } from '../appointments/appointment.repository';
import { type TransactionDoc } from './payment.model';
import { paymentRepository, type TransactionListFilters } from './payment.repository';
import { ProcessedWebhookEvent } from './webhookEvent.model';
import { walletService } from '../wallet/wallet.service';

/**
 * The slice of a Razorpay webhook payload we act on. Razorpay wraps the changed
 * entity under `payload.<entity>.entity`; for payment events that is a payment
 * carrying its `order_id`, which is how we find our Transaction. Everything is
 * optional — the body is only trusted after the raw-body signature check passes.
 */
interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; status?: string };
    };
  };
}

/** Rebuild the clinic's wallet after a money-affecting change; never fatal (it's a cache). */
async function refreshWallet(clinicId: string): Promise<void> {
  try {
    await walletService.recomputeWallet(clinicId);
  } catch (err) {
    logger.error({ err, clinicId }, 'Wallet recompute failed (will self-heal on next change)');
  }
}

/**
 * Promote a paid booking's PENDING_PAYMENT hold to a confirmed booking. The
 * convergence point for both the client verify call and the webhook backstop —
 * idempotent on the Transaction's own PAID status, so a race between them is safe.
 * The clinic's share is left PENDING settlement (set at order creation) and the
 * clinic wallet is recomputed after the transaction commits.
 */
async function confirmPaidOrder(
  orderId: string,
  opts: {
    razorpayPaymentId?: string | null;
    razorpaySignature?: string | null;
    razorpayStatus?: string | null;
  } = {},
): Promise<{ payment: TransactionDoc; appointment: AppointmentDoc | null }> {
  const result = await runInTransaction(async (session) => {
    const payment = await paymentRepository.findByRazorpayOrderId(orderId, session);
    if (!payment) throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found');

    const appointment = payment.appointmentId
      ? await appointmentRepository.findById(String(payment.appointmentId), session)
      : null;

    // Already confirmed (the other path won the race): no-op.
    if (payment.status === PAYMENT_STATUS.PAID) return { payment, appointment };

    if (appointment && appointment.status === APPOINTMENT_STATUS.PENDING_PAYMENT) {
      const confirmed = await appointmentRepository.countConfirmedInSlot(
        String(appointment.clinicId),
        appointment.date,
        appointment.slotStart,
        session,
      );
      appointment.tokenNo = confirmed + 1;
      appointment.status = APPOINTMENT_STATUS.BOOKED;
      appointment.holdExpiresAt = null;
      await appointment.save(session ? { session } : undefined);
    }

    payment.status = PAYMENT_STATUS.PAID;
    if (opts.razorpayPaymentId) payment.razorpayPaymentId = opts.razorpayPaymentId;
    if (opts.razorpaySignature) payment.razorpaySignature = opts.razorpaySignature;
    if (opts.razorpayStatus) payment.razorpayStatus = opts.razorpayStatus;
    payment.paidAt = new Date();
    // Settlement stays PENDING (set at creation); the admin clears it offline.
    await payment.save(session ? { session } : undefined);
    return { payment, appointment };
  });
  await refreshWallet(String(result.payment.clinicId));
  return result;
}

/** Payment failed/abandoned: mark it FAILED and release the still-pending hold. */
async function releaseFailedOrder(orderId: string, razorpayStatus?: string | null): Promise<void> {
  await runInTransaction(async (session) => {
    const payment = await paymentRepository.findByRazorpayOrderId(orderId, session);
    if (!payment || payment.status === PAYMENT_STATUS.PAID) return;
    if (payment.status !== PAYMENT_STATUS.FAILED) {
      payment.status = PAYMENT_STATUS.FAILED;
      if (razorpayStatus) payment.razorpayStatus = razorpayStatus;
      payment.failedAt = new Date();
      await payment.save(session ? { session } : undefined);
    }
    if (payment.appointmentId) {
      const appt = await appointmentRepository.findById(String(payment.appointmentId), session);
      if (appt && appt.status === APPOINTMENT_STATUS.PENDING_PAYMENT) {
        appt.status = APPOINTMENT_STATUS.CANCELLED;
        appt.cancelledAt = new Date();
        appt.cancelledBy = 'USER';
        appt.holdExpiresAt = null;
        await appt.save(session ? { session } : undefined);
      }
    }
  });
}

export const paymentService = {
  /**
   * Verify a checkout success handed back by the client, on behalf of the authed
   * owner of the order. Checks `HMAC_SHA256(order_id|payment_id) === signature`
   * before trusting anything, then confirms the booking. Scoped to the caller
   * (a mismatch is indistinguishable from not-found) so one user can't confirm
   * another's order. Idempotent — a second call after the webhook already confirmed
   * is a no-op that still returns PAID.
   */
  async verifyPayment(
    userId: string,
    input: { orderId: string; paymentId: string; signature: string },
  ): Promise<{ status: 'PAID'; appointmentId: string | null }> {
    const payment = await paymentRepository.findByRazorpayOrderId(input.orderId);
    if (!payment || String(payment.userId) !== userId) {
      throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found');
    }
    if (
      !verifyPaymentSignature({
        orderId: input.orderId,
        paymentId: input.paymentId,
        signature: input.signature,
      })
    ) {
      throw new AppError(400, ERROR_CODES.PAYMENT_VERIFICATION_FAILED, 'Payment verification failed');
    }

    const { appointment } = await confirmPaidOrder(input.orderId, {
      razorpayPaymentId: input.paymentId,
      razorpaySignature: input.signature,
      razorpayStatus: 'captured',
    });
    return { status: 'PAID', appointmentId: appointment ? String(appointment._id) : null };
  },

  /**
   * Razorpay webhook backstop. Verifies the signature over the RAW body, then
   * applies the same confirm/release the client verify does — so a dropped client
   * never leaves a captured payment unconfirmed. Idempotent via the
   * ProcessedWebhookEvent ledger keyed by the payment id + event, so a redelivery
   * is recognised and skipped. `rawBody` MUST be the exact bytes Razorpay signed.
   */
  async handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new AppError(400, ERROR_CODES.WEBHOOK_SIGNATURE_INVALID, 'Invalid webhook signature');
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      throw new AppError(400, ERROR_CODES.WEBHOOK_SIGNATURE_INVALID, 'Malformed webhook payload');
    }

    const event = payload.event ?? '';
    const entity = payload.payload?.payment?.entity;
    const orderId = entity?.order_id;
    if (!orderId) return; // not a payment event we act on (e.g. refund/settlement pings)

    // Razorpay doesn't send a stable per-delivery id in the body, so key idempotency
    // on the payment id + event (a payment emits e.g. captured only once).
    const evId = `rzp:${entity?.id ?? orderId}:${event}`;
    if (await ProcessedWebhookEvent.findOne({ eventId: evId })) {
      logger.info({ evId }, 'Duplicate Razorpay webhook; skipping');
      return;
    }

    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        await confirmPaidOrder(orderId, {
          razorpayPaymentId: entity?.id ?? null,
          razorpayStatus: entity?.status ?? 'captured',
        });
      } else if (event === 'payment.failed') {
        await releaseFailedOrder(orderId, entity?.status ?? 'failed');
      } else {
        return; // event we don't act on — don't record it as processed
      }
    } catch (err) {
      // A verified event for an order we never created (stale/test event): ACK it so
      // Razorpay stops retrying, but don't let it crash the handler.
      if (err instanceof NotFoundError) {
        logger.warn({ orderId }, 'Razorpay webhook for unknown order; ignoring');
      } else {
        throw err;
      }
    }

    try {
      await ProcessedWebhookEvent.create({ eventId: evId, event: event || 'unknown' });
    } catch (err) {
      logger.warn({ err, evId }, 'Could not record processed Razorpay webhook');
    }
  },

  /**
   * Status the user app polls after opening checkout. Scoped to the owner (a
   * mismatch is indistinguishable from not-found), returning just what the app's
   * step machine needs to advance. This is the resilient backstop to the direct
   * verify call — the webhook may confirm the booking even if the client dropped.
   */
  async getPaymentStatus(
    userId: string,
    orderId: string,
  ): Promise<{
    orderId: string;
    status: PaymentStatus;
    razorpayStatus: string | null;
    appointmentId: string | null;
    appointment: AppointmentDoc | null;
  }> {
    const payment = await paymentRepository.findByRazorpayOrderId(orderId);
    if (!payment || String(payment.userId) !== userId) {
      throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found');
    }
    // Once PAID, hand back the confirmed appointment (token + slot) so the app can
    // render its "booking confirmed" screen directly from the status poll.
    const appointment =
      payment.status === PAYMENT_STATUS.PAID && payment.appointmentId
        ? await appointmentRepository.findById(String(payment.appointmentId))
        : null;
    return {
      orderId,
      status: payment.status,
      razorpayStatus: payment.razorpayStatus ?? null,
      appointmentId: payment.appointmentId ? String(payment.appointmentId) : null,
      appointment,
    };
  },

  /**
   * Mark the transaction behind a cancelled appointment REFUNDED for bookkeeping
   * (no gateway auto-refund in this build — the platform settles offline). This
   * drops it from the clinic's PAID/settlement aggregation. Best-effort: returns
   * null when there is nothing to adjust (free/unpaid booking). The caller has
   * already cancelled the appointment itself.
   */
  async markRefundedForAppointment(
    appointmentId: string,
    reason: string,
  ): Promise<TransactionDoc | null> {
    const tx = await paymentRepository.findByAppointmentId(appointmentId);
    if (!tx || tx.status !== PAYMENT_STATUS.PAID) return null;
    tx.status = PAYMENT_STATUS.REFUNDED;
    tx.razorpayStatus = reason;
    await tx.save();
    await refreshWallet(String(tx.clinicId));
    return tx;
  },

  /** Admin: paginated transactions across all clinics (appointment populated). */
  async listForAdmin(
    filters: TransactionListFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: TransactionDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = paymentRepository.buildFilter(filters);
    const { items, total } = await paymentRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getByIdForAdmin(id: string): Promise<TransactionDoc> {
    const tx = await paymentRepository.findByIdWithAppointment(id);
    if (!tx) throw new NotFoundError(ERROR_CODES.PAYMENT_NOT_FOUND, 'Transaction not found');
    return tx;
  },

  /** Clinic: its own transactions (scoped by clinicId), newest first. */
  async listForClinic(
    clinicId: string,
    filters: { status?: string; settlementStatus?: string },
    page?: number,
    limit?: number,
  ): Promise<{ items: TransactionDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = paymentRepository.buildFilter({
      clinicId,
      status: filters.status,
      settlementStatus: filters.settlementStatus,
    });
    const { items, total } = await paymentRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  /**
   * Clinic earnings summary for the clinic app. Reads the (recomputed) wallet so
   * the clinic sees exactly what admin settles: its 90% share earned, split into
   * already-settled vs still-pending.
   */
  async clinicEarnings(clinicId: string): Promise<{
    clinicPayablePaise: number;
    settledPaise: number;
    pendingPaise: number;
    paidCount: number;
    currency: string;
  }> {
    const wallet = await walletService.recomputeWallet(clinicId);
    return {
      clinicPayablePaise: wallet.clinicPayablePaise,
      settledPaise: wallet.settledPaise,
      pendingPaise: wallet.pendingPaise,
      paidCount: wallet.paidCount,
      currency: 'INR',
    };
  },
};
