import { z } from 'zod';
import { PAYMENT_STATUS, SETTLEMENT_STATUS } from '../../utils/constants';
import { objectIdSchema, paginationQuerySchema } from '../../utils/validators';

/**
 * Admin transactions list: pagination + optional payment status / settlement
 * status / clinic / free-text search (order id, Razorpay payment id, clinic or
 * patient name/phone).
 */
export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PAYMENT_STATUS).optional(),
  settlementStatus: z.nativeEnum(SETTLEMENT_STATUS).optional(),
  clinicId: objectIdSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

/** Clinic's own transactions list: pagination + optional status / settlement status
 *  + an inclusive createdAt range (from/to) for the today/month/year/custom filters. */
export const listClinicPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PAYMENT_STATUS).optional(),
  settlementStatus: z.nativeEnum(SETTLEMENT_STATUS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/**
 * The Razorpay order id (`order_` + alphanumerics) we create in `startRazorpayOrder`.
 * Used to validate the :orderId path param on the authed status poll — a malformed
 * id can never reach a DB lookup.
 */
export const orderIdParamSchema = z
  .object({ orderId: z.string().trim().regex(/^order_[A-Za-z0-9]+$/, 'Invalid order id') })
  .strict();

/**
 * Body of the client verify endpoint — the three fields Razorpay checkout hands
 * back on success. The service checks `HMAC_SHA256(orderId|paymentId) === signature`
 * before trusting any of them (see `paymentService.verifyPayment`).
 */
export const verifyPaymentSchema = z
  .object({
    razorpayOrderId: z.string().trim().regex(/^order_[A-Za-z0-9]+$/, 'Invalid order id'),
    razorpayPaymentId: z.string().trim().regex(/^pay_[A-Za-z0-9]+$/, 'Invalid payment id'),
    razorpaySignature: z.string().trim().regex(/^[a-f0-9]{64}$/, 'Invalid signature'),
  })
  .strict();

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type ListClinicPaymentsQuery = z.infer<typeof listClinicPaymentsQuerySchema>;
export type VerifyPaymentBody = z.infer<typeof verifyPaymentSchema>;
