'use client';

// Thin client for the OnChikitsa backend, authenticated with the caller's
// Firebase ID token. Users never receive a backend JWT — the Firebase token is
// verified per-request by the backend (firebaseAuth). Envelopes are unwrapped to
// `data`; failures throw a typed ApiError so callers can branch on `.code`.
import { getIdToken } from './auth';

const BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api/v1';

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
  /** The post-OTP "account doesn't exist yet" signal from GET /user/me. */
  get userNotFound() {
    return this.code === 'USER_NOT_FOUND';
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (auth) {
    const token = await getIdToken();
    if (!token) throw new ApiError('NO_SESSION', 'You are not signed in.', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('NETWORK_TIMEOUT', 'Request timed out — please check your connection.', 0);
    }
    throw new ApiError('NETWORK', 'Network error — please check your connection.', 0);
  } finally {
    clearTimeout(id);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response handled below */
  }

  if (!res.ok || !json || json.success === false) {
    const err = (json && json.error) || {};
    throw new ApiError(err.code || 'ERROR', err.message || `Request failed (${res.status})`, res.status);
  }
  return json.data;
}

// Short-lived in-memory cache for GET /user/me. Every protected screen's routing
// guard calls resolveRoute() → getMe(), so navigating dashboard → profile →
// account would otherwise fire three separate DB reads within a second. A tiny
// TTL collapses those into one round-trip; writes refresh it, sign-out clears it.
let _meCache = null; // { at: number, data }
const ME_TTL_MS = 10000;

/** Drop the cached profile (call on sign-out / account switch). */
export function invalidateMe() {
  _meCache = null;
}

export const userApi = {
  /**
   * GET /user/me — profile, or 401 USER_NOT_FOUND if no account exists.
   * Served from the TTL cache unless `force` is true. Errors are never cached.
   */
  getMe: async (force = false) => {
    if (!force && _meCache && Date.now() - _meCache.at < ME_TTL_MS) return _meCache.data;
    const data = await request('/user/me');
    _meCache = { at: Date.now(), data };
    return data;
  },
  /** POST /user/register — create the profile after phone verification. */
  register: async (payload) => {
    const data = await request('/user/register', { method: 'POST', body: payload });
    _meCache = null; // force a fresh read on the next guard
    return data;
  },
  /** PATCH /user/me — enrich demographics / mirror onboarding + permissions. */
  updateMe: async (payload) => {
    const data = await request('/user/me', { method: 'PATCH', body: payload });
    _meCache = { at: Date.now(), data }; // PATCH returns the updated doc
    return data;
  },
};

export const faqApi = {
  /**
   * GET /user/faqs — the active FAQs shown on the Support screen.
   * Returns an array of `{ _id, question, answer, order }`, already sorted
   * by the admin-defined order. Curated entirely from the admin panel.
   */
  list: () => request('/user/faqs'),
};

export const supportApi = {
  /**
   * POST /user/support — raise a support query. The backend stamps the
   * raising user from the Firebase token; callers pass only subject + message.
   * The new ticket then surfaces in the admin panel's Support section.
   */
  create: (payload) => request('/user/support', { method: 'POST', body: payload }),
  /** GET /user/support — the caller's own previously-raised tickets. */
  listMine: () => request('/user/support'),
};

export const clinicApi = {
  /**
   * GET /user/clinics — the patient-facing clinic directory. Each item is a full
   * clinic doc enriched by the backend with `doctorsCount`, `seatsToday` and a
   * lowercase `slotStatus` ('active' | 'booked' | 'closed') for today. We pull a
   * generous page and let the Explore screen filter/search client-side.
   */
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.specialty) qs.set('specialty', params.specialty);
    if (params.city) qs.set('city', params.city);
    qs.set('limit', String(params.limit || 100));
    return request(`/user/clinics?${qs.toString()}`);
  },
  /** GET /user/clinics/:id — one clinic with its active doctors + today's summary. */
  get: (id) => request(`/user/clinics/${id}`),
  /**
   * GET /user/clinics/:id/slots?date=YYYY-MM-DD — the slot-picker feed for a date.
   * Returns `{ open, reason, slots:[{start,end,capacity,booked,available,past}],
   * advanceBookingDays, sameDayBooking, ... }`.
   */
  slots: (id, date) => request(`/user/clinics/${id}/slots?date=${encodeURIComponent(date)}`),
};

export const bookingApi = {
  /**
   * POST /user/bookings — reserve one slot. Payload:
   * `{ clinicId, date, slotStart, slotEnd, patient:{name,phone,age?,gender?}, reason? }`.
   * Returns the created appointment (with its `tokenNo`).
   */
  create: (payload) => request('/user/bookings', { method: 'POST', body: payload }),
  /** GET /user/bookings?scope= — the caller's own bookings (upcoming | past | all). */
  listMine: (scope = 'all') => request(`/user/bookings?scope=${scope}&limit=100`),
  /** POST /user/bookings/:id/cancel — cancel a still-booked appointment. */
  cancel: (id) => request(`/user/bookings/${id}/cancel`, { method: 'POST' }),
};

export const paymentApi = {
  /**
   * POST /user/payments/order — Phase A of payment-first booking. Validates the
   * slot, reserves it with a short-lived PENDING_PAYMENT hold, creates the Razorpay
   * order, and returns the checkout params + full price breakdown. Payload matches
   * bookingApi.create:
   * `{ clinicId, date, slotStart, slotEnd, patient:{name,phone,age?,gender?}, reason? }`.
   *
   * Every payment is collected through Razorpay into the platform's account. Returns
   * `{ appointmentId, paymentId, amountPaise, currency, breakdown, holdExpiresAt,
   *    clinic:{id,name}, razorpay:{ keyId, orderId, amountPaise, currency } }`
   *  → open Razorpay Checkout with `razorpay` (native RazorpayNative plugin on Android,
   *    or checkout.js on web), then POST /verify the signed success and poll status(orderId).
   */
  createOrder: (payload) => request('/user/payments/order', { method: 'POST', body: payload }),
  /**
   * POST /user/payments/verify — confirm a checkout success handed back by the SDK.
   * Body `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`; the backend
   * checks `HMAC_SHA256(order_id|payment_id) === signature` before confirming the
   * booking. Returns `{ status:'PAID', appointmentId }`. Idempotent with the webhook.
   */
  verifyPayment: (payload) => request('/user/payments/verify', { method: 'POST', body: payload }),
  /**
   * GET /user/payments/status/:orderId — Phase B poll while checkout runs / after it
   * returns. Returns `{ orderId, status, razorpayStatus, appointmentId, appointment }`;
   * `status` is CREATED | PAID | FAILED | REFUNDED, and once PAID the confirmed
   * `appointment` (with its token) is included. This is the resilient backstop to the
   * direct /verify call — the webhook may confirm the booking even if the client drops.
   */
  status: (orderId) => request(`/user/payments/status/${orderId}`),
};
