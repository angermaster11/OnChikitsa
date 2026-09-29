import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from './env';
import { logger } from './logger';
import { AppError, ERROR_CODES } from '../utils/errors';

/**
 * Razorpay integration — the app's single payment gateway.
 *
 * Flow (order-based Standard Checkout, native SDK on Android + checkout.js on web):
 *  1. ORDER   — we create a Razorpay order for the exact amount (paise) and store
 *     its `order_id` on our Transaction. The order is the server-side anchor: the
 *     amount is fixed by us, never trusted from the client.
 *  2. CHECKOUT— the app opens Razorpay checkout with `{ key_id, order_id, prefill }`.
 *     Razorpay renders its OWN native UI (Google Pay / UPI-app hand-off / cards /
 *     netbanking) — no embedded WebView to dead-end in.
 *  3. VERIFY  — on success the SDK returns `razorpay_payment_id` + `razorpay_signature`;
 *     we verify `HMAC_SHA256(order_id | payment_id, key_secret) === signature` before
 *     trusting it, then confirm the booking.
 *  4. WEBHOOK — a signed `payment.captured` / `payment.failed` event backstops the
 *     verify call (verified with the separate webhook secret over the RAW body), so a
 *     dropped client never leaves a paid booking unconfirmed.
 *
 * Money is ALWAYS integer paise, end to end — Razorpay's amount unit is also paise,
 * so there is no rupee/paise conversion at this boundary (unlike the old PayU flow).
 *
 * The clinic's share is settled to it OFFLINE by the admin (the platform collects
 * the full amount into its single Razorpay account); there is no gateway split /
 * per-clinic payout in this build.
 */

// ---------------------------------------------------------------------------
// Configuration gate (503-until-set, mirrors the Cloudinary optional-service pattern)
// ---------------------------------------------------------------------------

export function isRazorpayConfigured(): boolean {
  return env.razorpayConfigured;
}
export function assertRazorpayConfigured(): void {
  if (!env.razorpayConfigured) {
    throw new AppError(503, ERROR_CODES.PAYMENT_NOT_CONFIGURED, 'Payments are not configured');
  }
}

/** The publishable key the client needs to open checkout (safe to ship in the app). */
export function razorpayKeyId(): string {
  return (env.RAZORPAY_KEY_ID ?? '').trim();
}

/** Lazily-built SDK client (only orders.create needs it; signatures are plain HMAC). */
let client: Razorpay | null = null;
function razorpayClient(): Razorpay {
  assertRazorpayConfigured();
  if (!client) {
    client = new Razorpay({
      key_id: razorpayKeyId(),
      key_secret: (env.RAZORPAY_KEY_SECRET ?? '').trim(),
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  /** Integer paise — the exact amount to collect. */
  amountPaise: number;
  /** Our own reference (Transaction _id); echoed back on the order + in notes. */
  receipt: string;
  /** Free-form key/value pairs Razorpay stores on the order (all values stringified). */
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string; // "order_XXXXXXXX"
  amountPaise: number;
  currency: string;
}

/**
 * Create a Razorpay order for `amountPaise`. Throws PAYMENT_ORDER_FAILED on any
 * gateway/network error so the caller can release the seat hold cleanly rather
 * than crashing the booking path.
 */
export async function createOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  assertRazorpayConfigured();
  try {
    const order = await razorpayClient().orders.create({
      amount: Math.round(input.amountPaise),
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
    });
    logger.info(
      { orderId: order.id, amountPaise: input.amountPaise, receipt: input.receipt },
      'Razorpay order created',
    );
    return {
      id: order.id,
      amountPaise: Number(order.amount),
      currency: String(order.currency ?? 'INR'),
    };
  } catch (err) {
    logger.error({ err, receipt: input.receipt }, 'Razorpay order creation failed');
    throw new AppError(502, ERROR_CODES.PAYMENT_ORDER_FAILED, 'Could not create the payment order');
  }
}

// ---------------------------------------------------------------------------
// Signature verification (checkout handoff + webhook) — plain, stable HMAC-SHA256
// ---------------------------------------------------------------------------

/**
 * Verify the checkout success signature Razorpay hands the client:
 *   HMAC_SHA256(`${order_id}|${payment_id}`, key_secret) === razorpay_signature
 * Returns false — never throws — so callers map the failure to
 * PAYMENT_VERIFICATION_FAILED themselves. Constant-time compare.
 */
export function verifyPaymentSignature(p: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = (env.RAZORPAY_KEY_SECRET ?? '').trim();
  if (!secret || !p.orderId || !p.paymentId || !p.signature) return false;
  const expected = hmacHex(`${p.orderId}|${p.paymentId}`, secret);
  return safeEqualHex(expected, p.signature);
}

/**
 * Verify an inbound webhook: HMAC_SHA256(rawBody, WEBHOOK_SECRET) === X-Razorpay-Signature.
 * MUST run over the exact raw request bytes (see the express.raw mount for the
 * webhook route), not a re-serialised body. Returns false on any mismatch/misconfig.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  const secret = (env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();
  if (!secret || !signature) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const expected = hmacHex(payload, secret);
  return safeEqualHex(expected, signature);
}

function hmacHex(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time hex compare (guards only when lengths already match). */
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b.toLowerCase(), 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
