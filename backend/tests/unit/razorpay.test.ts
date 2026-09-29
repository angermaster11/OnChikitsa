import crypto from 'node:crypto';
import {
  isRazorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../../src/config/razorpay';

/**
 * The two Razorpay signature checks are the security boundary of the whole payment
 * flow — nothing is trusted until one of them passes. These tests pin the exact HMAC
 * they compute against Razorpay's documented scheme, using the dummy secrets injected
 * by globalSetup (no network is touched — orders.create is never called here).
 */
const KEY_SECRET = 'rzp_test_dummysecret'; // must mirror tests/globalSetup.ts
const WEBHOOK_SECRET = 'whsec_test_dummy'; // must mirror tests/globalSetup.ts

const hmacHex = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

describe('razorpay config gate', () => {
  it('reports configured and exposes the publishable key from the test env', () => {
    expect(isRazorpayConfigured()).toBe(true);
    expect(razorpayKeyId()).toBe('rzp_test_dummykey');
  });
});

describe('verifyPaymentSignature (checkout handoff)', () => {
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';

  it('accepts the signature Razorpay computes over `${order_id}|${payment_id}`', () => {
    const signature = hmacHex(`${orderId}|${paymentId}`, KEY_SECRET);
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it('rejects a signature for a different payment id (tampered)', () => {
    const signature = hmacHex(`${orderId}|${paymentId}`, KEY_SECRET);
    expect(verifyPaymentSignature({ orderId, paymentId: 'pay_TAMPERED', signature })).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const signature = hmacHex(`${orderId}|${paymentId}`, 'not-the-secret');
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(false);
  });

  it('rejects empty / missing fields without throwing', () => {
    expect(verifyPaymentSignature({ orderId: '', paymentId, signature: 'x' })).toBe(false);
    expect(verifyPaymentSignature({ orderId, paymentId, signature: '' })).toBe(false);
  });
});

describe('verifyWebhookSignature (raw-body HMAC)', () => {
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });

  it('accepts a signature over the exact raw body (string or Buffer)', () => {
    const signature = hmacHex(rawBody, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(rawBody, 'utf8'), signature)).toBe(true);
  });

  it('rejects when the body is altered after signing', () => {
    const signature = hmacHex(rawBody, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(`${rawBody} `, signature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyWebhookSignature(rawBody, undefined)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const signature = hmacHex(rawBody, 'wrong-webhook-secret');
    expect(verifyWebhookSignature(rawBody, signature)).toBe(false);
  });
});
