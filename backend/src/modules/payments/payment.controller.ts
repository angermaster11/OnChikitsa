import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { appointmentService } from '../appointments/appointment.service';
import type { CreateBookingBody } from '../appointments/appointment.validation';
import { paymentService } from './payment.service';
import { walletService } from '../wallet/wallet.service';
import type {
  ListPaymentsQuery,
  ListClinicPaymentsQuery,
  VerifyPaymentBody,
} from './payment.validation';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

export const paymentController = {
  // ---- Patient-facing (Firebase USER) ----
  /** Create the Razorpay order + PENDING_PAYMENT hold; returns the checkout handles. */
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await appointmentService.createBookingOrder(actor.id, req.body as CreateBookingBody);
    sendSuccess(res, result, 'Payment order created', 201);
  }),

  /** Verify a checkout success from the client (signature check) and confirm the booking. */
  verifyPayment: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const body = req.body as VerifyPaymentBody;
    const result = await paymentService.verifyPayment(actor.id, {
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    });
    sendSuccess(res, result, 'Payment verified');
  }),

  /** Authed status poll for the user app after opening checkout. */
  paymentStatus: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const status = await paymentService.getPaymentStatus(actor.id, req.params.orderId);
    sendSuccess(res, status, 'Payment status');
  }),

  // ---- Clinic-facing (Firebase CLINIC) ----
  earnings: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const summary = await paymentService.clinicEarnings(actor.id);
    sendSuccess(res, summary, 'Earnings retrieved');
  }),

  listClinicPayments: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const q = req.query as unknown as ListClinicPaymentsQuery;
    const { items, pagination } = await paymentService.listForClinic(
      actor.id,
      { status: q.status, settlementStatus: q.settlementStatus },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  // ---- Admin-facing ----
  listPayments: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListPaymentsQuery;
    const { items, pagination } = await paymentService.listForAdmin(
      { status: q.status, clinicId: q.clinicId, settlementStatus: q.settlementStatus, search: q.search },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getPayment: asyncHandler(async (req: Request, res: Response) => {
    const transaction = await paymentService.getByIdForAdmin(req.params.id);
    sendSuccess(res, transaction, 'Transaction retrieved');
  }),

  /** Admin: settle a single PAID transaction's clinic share offline (audited). */
  settleTransaction: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await walletService.settleTransaction(actor, req.params.id, ctx(req));
    sendSuccess(res, result, 'Transaction settled');
  }),

  // ---- Razorpay webhook (NO auth; verified by the raw-body signature) ----
  /**
   * Razorpay webhook backstop. Mounted with express.raw so `req.body` is the exact
   * Buffer Razorpay signed — the service HMACs it against RAZORPAY_WEBHOOK_SECRET
   * and rejects a bad `X-Razorpay-Signature`. Always ACK 200 on a verified event so
   * Razorpay stops retrying; a bad signature surfaces as the usual error envelope.
   */
  razorpayWebhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.header('x-razorpay-signature');
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    await paymentService.handleRazorpayWebhook(raw, signature);
    res.status(200).json({ received: true });
  }),
};
