'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, MapPin, Phone, Mail, CheckCircle, ChevronRight, AlertCircle,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { flow } from '../_lib/flow';
import { clinicApi, paymentApi, ApiError } from '../_lib/api';
import { mapClinicDetail, to12, dateLabel, formatINR } from '../_lib/clinicMap';
import styles from './clinic.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
const STATUS_LABEL = { active: 'Active', booked: 'Fully booked', closed: 'Closed' };
const STATUS_CLASS = { active: 'stActive', booked: 'stBooked', closed: 'stClosed' };
const GENDERS = [{ key: 'MALE', label: 'Male' }, { key: 'FEMALE', label: 'Female' }, { key: 'OTHER', label: 'Other' }];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Why a chosen date has no bookable slots → the note shown under the date strip.
const CLOSED_MSG = {
  WEEKLY_OFF: 'Closed on this day.',
  HOLIDAY: 'Closed for a holiday on this date.',
  SAME_DAY_DISABLED: 'Same-day booking isn’t available here.',
  ADVANCE: 'This date is beyond the booking window.',
  PAST: 'This date has already passed.',
  FULL: 'All slots for this day are full.',
};
// Booking-submit failures → a friendly line (slot races, etc.).
const BOOK_ERR = {
  SLOT_FULL: 'That slot just filled up. Please pick another time.',
  SLOT_UNAVAILABLE: 'That time is no longer available. Please pick another.',
  ALREADY_BOOKED: 'You already have a booking in this slot.',
  BOOKING_DISABLED: 'This clinic isn’t accepting online bookings right now.',
  CLINIC_NOT_FOUND: 'This clinic is no longer available.',
};
const SLOT_ERR_CODES = ['SLOT_FULL', 'SLOT_UNAVAILABLE', 'ALREADY_BOOKED'];

// Payment-flow failures (order creation) → a friendly line.
const PAY_ERR = {
  PAYMENT_NOT_CONFIGURED: 'Online payments aren’t available right now. Please try again later.',
  PAYMENT_ORDER_FAILED: 'Could not start the payment. Please try again.',
  HOLD_EXPIRED: 'Your seat hold expired. Please pick the slot again.',
};

// Lazily register the native Razorpay bridge (Capacitor Android). Memoised so we
// register once per session.
//
// CRITICAL: registerPlugin() returns a Proxy that turns EVERY property access into a
// native method call — including `.then`. If this async function returned that proxy
// directly, JS promise-resolution would treat it as a "thenable", call
// `proxy.then(resolve, reject)`, and dispatch a non-existent native `then` method.
// The await then NEVER settles (native `then` never invokes resolve/reject) — the
// permanent "Waiting for payment…" hang — while logging
// `"RazorpayNative.then() is not implemented on android"`. So we hand back a plain,
// non-thenable wrapper; `pay()` on it returns a real Promise the caller can await.
let _razorpayNative = null;
async function getRazorpayNative() {
  if (_razorpayNative) return _razorpayNative;
  const { registerPlugin } = await import('@capacitor/core');
  const proxy = registerPlugin('RazorpayNative');
  _razorpayNative = { pay: (opts) => proxy.pay(opts) };
  return _razorpayNative;
}

// Load Razorpay's web checkout.js once (browser / PWA fallback), resolving the global
// Razorpay constructor.
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('no window')); return; }
    if (window.Razorpay) { resolve(window.Razorpay); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay unavailable')));
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

// Open Razorpay Checkout and resolve a NORMALISED outcome:
//   { status:'success', razorpayOrderId, razorpayPaymentId, razorpaySignature }
//   { status:'cancelled' } | { status:'failed', message }
// On native (Capacitor Android) this drives Razorpay's OWN native checkout via the
// RazorpayNative plugin — real Google Pay / UPI-app hand-off / cards, all in-process
// (no embedded WebView, which is exactly what dead-ended PayU). On web it uses
// checkout.js. Either way the backend status poll stays the resilient source of truth.
async function openRazorpayCheckout(quote, prefill) {
  const { keyId, orderId, amountPaise, currency } = quote.razorpay;
  const name = (quote.clinic && quote.clinic.name) || 'OnChikitsa';

  let isNative = false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNative = Capacitor.isNativePlatform();
  } catch { isNative = false; }

  if (isNative) {
    const RazorpayNative = await getRazorpayNative();
    // The plugin resolves once with the normalised shape above.
    return RazorpayNative.pay({
      keyId, orderId, amountPaise, currency,
      name, description: 'Consultation booking',
      prefill: prefill || {},
    });
  }

  const Razorpay = await loadRazorpayScript();
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const rzp = new Razorpay({
      key: keyId,
      order_id: orderId,
      amount: amountPaise,
      currency,
      name,
      description: 'Consultation booking',
      prefill: prefill || {},
      handler: (r) => done({
        status: 'success',
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        razorpaySignature: r.razorpay_signature,
      }),
      modal: { ondismiss: () => done({ status: 'cancelled' }) },
    });
    rzp.on('payment.failed', (resp) => done({
      status: 'failed',
      message: (resp && resp.error && resp.error.description) || 'Payment failed',
    }));
    rzp.open();
  });
}

// Local "YYYY-MM-DD" (the backend uses India-local dates, so we match with local time).
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// The bookable date strip: [today?, …, today+advance], capped so the UI stays sane.
function buildDateList(advanceDays, sameDay) {
  const out = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const cap = Math.min(Number.isFinite(advanceDays) ? advanceDays : 14, 30);
  for (let i = sameDay ? 0 : 1; i <= cap; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    out.push(toDateStr(d));
  }
  return out;
}
// Keep only a leading "+" and digits — matches the backend's ^\+?[0-9]{7,15}$.
function normalizePhone(v) {
  const t = String(v || '').trim();
  return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '');
}
function chipParts(ds, today) {
  const [y, m, dd] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, dd);
  return { dow: ds === today ? 'Today' : DOW[dt.getDay()], day: dd };
}

export default function Clinic() {
  const router = useRouter();
  const clinicId = flow.getClinicId();

  const [checking, setChecking] = useState(true);
  const [clinic, setClinic] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState('booking'); // booking | about | contact
  const [step, setStep] = useState('pick');  // pick | form | pay | done

  // Date + slot picker.
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingDisabled, setBookingDisabled] = useState(false);
  const [day, setDay] = useState(null);            // DayAvailability for selectedDate
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null); // { start, end }
  const [reloadKey, setReloadKey] = useState(0);

  // Patient form.
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');

  // Submit.
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [submitCode, setSubmitCode] = useState('');
  const [result, setResult] = useState(null);

  // Payment (Phase A → order + breakdown; Phase B → Razorpay Checkout + verify/poll).
  const [quote, setQuote] = useState(null); // { razorpay:{keyId,orderId,amountPaise,currency}, breakdown, clinic, ... }
  const [profileEmail, setProfileEmail] = useState('');
  const [paying, setPaying] = useState(false);
  // Razorpay status-poll bookkeeping. The poll is the resilient source of truth: the
  // webhook may confirm the booking even if the SDK callback / verify is lost.
  const pollStopRef = useRef(false);
  const pollTimerRef = useRef(null);

  // Auth gate + onboarding guard, then load the real clinic detail. Mirrors Explore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      if (!clinicId) { router.replace('/explore'); return; }
      setChecking(false);
      // Prefill the patient with the signed-in user's own details (editable).
      try {
        const p = flow.getProfile();
        if (!cancelled && p) {
          if (p.name) setName(p.name);
          if (p.phone) setPhone(p.phone);
          if (p.email) setProfileEmail(p.email);
        }
      } catch { /* no saved profile */ }
      try {
        const detail = await clinicApi.get(clinicId);
        if (!cancelled) setClinic(mapClinicDetail(detail));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) { router.replace('/explore'); return; }
        setLoadErr(err instanceof ApiError ? err.message : 'Could not load this clinic.');
      }
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay */ }
    })();
    return () => { cancelled = true; };
  }, [router, clinicId]);

  // Read today's config once to size the date strip (advance window + same-day rule).
  useEffect(() => {
    if (!clinic) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await clinicApi.slots(clinic.id, toDateStr(new Date()));
        if (cancelled) return;
        if (d.reason === 'BOOKING_DISABLED') { setBookingDisabled(true); setSlotsLoading(false); return; }
        const list = buildDateList(d.advanceBookingDays, d.sameDayBooking !== false);
        setDates(list);
        setSelectedDate(list[0] || '');
        if (!list.length) setSlotsLoading(false);
      } catch {
        if (!cancelled) { setDates([]); setSlotsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [clinic]);

  // Fetch the picked date's slots (also on manual retry via reloadKey).
  useEffect(() => {
    if (!clinic || !selectedDate) return;
    let cancelled = false;
    setSlotsLoading(true); setSelectedSlot(null);
    (async () => {
      try {
        const d = await clinicApi.slots(clinic.id, selectedDate);
        if (!cancelled) setDay(d);
      } catch {
        if (!cancelled) setDay(null);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clinic, selectedDate, reloadKey]);

  const today = toDateStr(new Date());
  const dayOpen = !!(day && day.open);
  const openSlots = dayOpen ? (day.slots || []) : [];
  const canConfirm = name.trim().length >= 2 && normalizePhone(phone).length >= 7 && !!selectedSlot;

  // Phase A: reserve the slot + create the Razorpay order, then show the pay step.
  const startPayment = async () => {
    if (!clinic || !selectedDate || !selectedSlot) return;
    setSubmitting(true); setSubmitErr(''); setSubmitCode('');
    const patient = { name: name.trim(), phone: normalizePhone(phone) };
    const ageNum = parseInt(age, 10);
    if (!Number.isNaN(ageNum) && ageNum > 0) patient.age = ageNum;
    if (gender) patient.gender = gender;
    const payload = { clinicId: clinic.id, date: selectedDate, slotStart: selectedSlot.start, slotEnd: selectedSlot.end, patient };
    const r = reason.trim();
    if (r) payload.reason = r;
    try {
      const q = await paymentApi.createOrder(payload);
      setQuote(q);
      setStep('pay');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setSubmitCode(code);
      setSubmitErr(PAY_ERR[code] || BOOK_ERR[code] || (err instanceof ApiError ? err.message : 'Could not start the payment. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Stop any in-flight status poll.
  const stopStatusPoll = () => {
    pollStopRef.current = true;
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  };
  // Tear the poll down if the user leaves this screen mid-payment.
  useEffect(() => stopStatusPoll, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll GET /status/:orderId until the payment reaches a terminal state. This is the
  // resilient backstop: the webhook confirms the booking even if the direct /verify
  // call was lost. On PAID it returns the confirmed appointment (token + slot).
  const runStatusPoll = (orderId, deadline) => {
    const tick = async () => {
      if (pollStopRef.current) return;
      let s;
      try {
        s = await paymentApi.status(orderId);
      } catch {
        // Transient poll failure — keep trying until the deadline.
        if (!pollStopRef.current && Date.now() < deadline) pollTimerRef.current = setTimeout(tick, 2500);
        return;
      }
      if (pollStopRef.current) return;
      if (s.status === 'PAID') {
        stopStatusPoll();
        setPaying(false);
        if (s.appointment) { setResult(s.appointment); setStep('done'); }
        else router.push('/bookings'); // confirmed but no snapshot — send to the list
        return;
      }
      if (s.status === 'FAILED' || s.status === 'REFUNDED') {
        stopStatusPoll();
        setPaying(false);
        setSubmitErr('The payment wasn’t completed. Please try again.');
        return;
      }
      // Still pending → keep polling until the seat-hold deadline.
      if (Date.now() < deadline) {
        pollTimerRef.current = setTimeout(tick, 2500);
      } else {
        stopStatusPoll();
        setPaying(false);
        setSubmitErr('We haven’t received your payment yet. If you completed it, check “My bookings” in a moment.');
      }
    };
    tick();
  };

  // Phase B (Razorpay): open Razorpay's native checkout (real Google Pay / UPI-app
  // hand-off / cards, in-process — no embedded WebView) and act on its outcome. A
  // signed success is POSTed to /verify for an instant confirm; the status poll runs
  // as the webhook-backed backstop and also fetches the confirmed appointment.
  const openRazorpayFlow = async () => {
    if (!quote || !quote.razorpay || !quote.razorpay.orderId || paying) return;
    setPaying(true); setSubmitErr(''); setSubmitCode('');
    pollStopRef.current = false;
    const orderId = quote.razorpay.orderId;
    const deadline = Date.now() + 6 * 60 * 1000; // roughly the seat-hold window

    // Start the webhook-backed status poll NOW, before opening checkout — not only
    // after the SDK callback returns. Razorpay delivers its result to the native
    // activity, and that hand-off can be lost (process death during the UPI-app
    // switch, a swallowed open() error, etc.); if the poll only started on the
    // callback, a lost callback would leave the screen stuck on "Waiting for
    // payment…" forever. Running it concurrently means the webhook still confirms
    // the booking, and the poll's own deadline guarantees we never hang: it always
    // reaches a terminal state (PAID / FAILED) or times out with a clear message.
    runStatusPoll(orderId, deadline);

    let outcome;
    try {
      outcome = await openRazorpayCheckout(quote, { contact: normalizePhone(phone), email: profileEmail });
    } catch {
      // Checkout couldn't open. The backstop poll is already running, so only
      // surface an error if it hasn't already reached a terminal state.
      if (!pollStopRef.current) {
        stopStatusPoll();
        setPaying(false);
        setSubmitErr('Could not open the payment. Please try again.');
      }
      return;
    }
    if (pollStopRef.current) return; // the poll already confirmed/closed this order

    if (outcome && outcome.status === 'success') {
      // Fast path: verify the SDK's signed success so the booking confirms at once.
      // The poll (already running) is the resilient backstop and also reads back the
      // confirmed appointment, so a dropped /verify still resolves via the webhook.
      try {
        await paymentApi.verifyPayment({
          razorpayOrderId: outcome.razorpayOrderId || orderId,
          razorpayPaymentId: outcome.razorpayPaymentId,
          razorpaySignature: outcome.razorpaySignature,
        });
      } catch { /* verify dropped → the webhook-backed status poll still confirms it */ }
      return;
    }

    // Cancelled or failed: stop the backstop poll — the seat hold survives for a few
    // minutes, so let them retry.
    stopStatusPoll();
    setPaying(false);
    setSubmitErr(
      outcome && outcome.status === 'cancelled'
        ? 'Payment cancelled. You can try again — your slot is held for a few minutes.'
        : 'The payment wasn’t completed. Please try again.',
    );
  };

  const pay = () => openRazorpayFlow();

  // A slot race → send the user back to a freshly-reloaded picker.
  const pickAnother = () => {
    stopStatusPoll();
    setSubmitErr(''); setSubmitCode(''); setSelectedSlot(null); setQuote(null);
    setStep('pick'); setReloadKey((k) => k + 1);
  };

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  if (loadErr) {
    return (
      <main className={styles.screen}>
        <div className={styles.topbar}>
          <button className={styles.back} onClick={() => router.push('/explore')} aria-label="Back"><ArrowLeft size={22} /></button>
        </div>
        <div className={styles.stateBox}>
          <AlertCircle size={26} />
          <p>{loadErr}</p>
          <button className={styles.selfBtn} onClick={() => router.push('/explore')}>Back to Explore</button>
        </div>
      </main>
    );
  }

  if (!clinic) return <main className={styles.screen} aria-busy="true" />;

  const Glyph = GLYPHS[clinic.glyph] || Building;

  return (
    <main className={styles.screen}>
      <div className={styles.banner}>
        <button className={styles.back} onClick={() => router.push('/explore')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <p className={styles.bannerTitle}>Clinic</p>
      </div>

      <div className={styles.hero}>
        <div className={`${styles.logo} ${styles[clinic.g]}`}>
          <Glyph size={30} />
        </div>
        <div className={styles.heroBody}>
          <h1 className={styles.name}>{clinic.name}</h1>
          <p className={styles.meta}>{clinic.cat} · {clinic.area}</p>
          <div className={styles.heroRow}>
            <span className={`${styles.badge} ${styles[STATUS_CLASS[clinic.status]]}`}>{STATUS_LABEL[clinic.status]}</span>
            <span className={styles.reviews}>{clinic.doctorsCount} doctor{clinic.doctorsCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${tab === 'booking' ? styles.on : ''}`} onClick={() => setTab('booking')}>Booking</button>
        <button className={`${styles.tabBtn} ${tab === 'about' ? styles.on : ''}`} onClick={() => setTab('about')}>About</button>
        <button className={`${styles.tabBtn} ${tab === 'contact' ? styles.on : ''}`} onClick={() => setTab('contact')}>Contact</button>
      </div>

      {tab === 'booking' && step === 'pick' && (
        <div className={styles.pane}>
          <div className={styles.seatCard}>
            <div className={styles.seatRow}>
              <Clock size={17} />
              <span className={styles.rowLabel}>Hours</span>
              <span>{clinic.hours}</span>
            </div>
            <div className={styles.seatRow}>
              <MapPin size={17} />
              <span className={styles.rowLabel}>Location</span>
              <span>{clinic.area}</span>
            </div>
          </div>

          {bookingDisabled ? (
            <p className={styles.note}>This clinic isn’t accepting online bookings right now.</p>
          ) : dates.length === 0 ? (
            <p className={styles.note}>No booking dates are available right now.</p>
          ) : (
            <>
              <p className={styles.pickerLabel}>Select a date</p>
              <div className={styles.dateStrip}>
                {dates.map((ds) => {
                  const p = chipParts(ds, today);
                  return (
                    <button key={ds} className={`${styles.dateChip} ${selectedDate === ds ? styles.on : ''}`} onClick={() => setSelectedDate(ds)}>
                      <span className={styles.dateDow}>{p.dow}</span>
                      <span className={styles.dateDay}>{p.day}</span>
                    </button>
                  );
                })}
              </div>

              <p className={styles.pickerLabel}>Select a time</p>
              {slotsLoading ? (
                <p className={styles.hint}>Loading slots…</p>
              ) : !dayOpen ? (
                <p className={styles.closedMsg}>{CLOSED_MSG[day?.reason] || 'No slots available for this day.'}</p>
              ) : (
                <div className={styles.slotGrid}>
                  {openSlots.map((s) => {
                    const disabled = s.past || s.available <= 0;
                    const sel = selectedSlot && selectedSlot.start === s.start && selectedSlot.end === s.end;
                    return (
                      <button key={s.start} disabled={disabled}
                        className={`${styles.slotChip} ${sel ? styles.on : ''}`}
                        onClick={() => setSelectedSlot({ start: s.start, end: s.end })}>
                        {to12(s.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <button className={styles.cta} disabled={!selectedSlot} onClick={() => { setSubmitErr(''); setSubmitCode(''); setStep('form'); }}>
            Continue
          </button>
        </div>
      )}

      {tab === 'booking' && step === 'form' && (
        <div className={styles.pane}>
          <button className={styles.selfBtn} onClick={() => setStep('pick')}>
            <ArrowLeft size={16} /> {dateLabel(selectedDate)} · {selectedSlot ? `${to12(selectedSlot.start)} – ${to12(selectedSlot.end)}` : ''}
          </button>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Patient name</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone number</label>
              <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" inputMode="tel" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Age (optional)</label>
              <input className={styles.input} value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Years" inputMode="numeric" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gender (optional)</label>
              <div className={styles.chips}>
                {GENDERS.map((g) => (
                  <button key={g.key} className={`${styles.chip} ${gender === g.key ? styles.on : ''}`}
                    onClick={() => setGender(gender === g.key ? '' : g.key)}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reason for visit (optional)</label>
              <textarea className={styles.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} placeholder="Describe your symptoms or reason" />
            </div>
          </div>

          {submitErr && <p className={styles.errline}>{submitErr}</p>}

          {SLOT_ERR_CODES.includes(submitCode) ? (
            <button className={styles.cta} onClick={pickAnother}>Choose another slot</button>
          ) : (
            <button className={styles.cta} disabled={!canConfirm || submitting} onClick={startPayment}>
              {submitting ? 'Preparing payment…' : 'Continue to payment'}
            </button>
          )}
        </div>
      )}

      {tab === 'booking' && step === 'pay' && quote && (
        <div className={styles.pane}>
          <button
            className={styles.selfBtn}
            onClick={() => { stopStatusPoll(); setPaying(false); setStep('form'); setSubmitErr(''); setSubmitCode(''); }}
          >
            <ArrowLeft size={16} /> {dateLabel(selectedDate)} · {selectedSlot ? `${to12(selectedSlot.start)} – ${to12(selectedSlot.end)}` : ''}
          </button>

          <div className={styles.doneCard}>
            <div className={styles.doneRow}><span>Consultation fee</span><b>{formatINR(quote.breakdown.consultationFeePaise)}</b></div>
            <div className={styles.doneRow}><span>Platform fee</span><b>{formatINR(quote.breakdown.platformFeePaise)}</b></div>
            <div className={styles.doneRow}><span>GST ({quote.breakdown.gstRate}%)</span><b>{formatINR(quote.breakdown.gstPaise)}</b></div>
            <div className={styles.doneRow}><span>Total payable</span><b>{formatINR(quote.breakdown.totalPaise)}</b></div>
          </div>

          <p className={styles.note}>
            You’ll pay securely via Razorpay. After paying, we’ll confirm your booking automatically.
          </p>

          {paying && (
            <p className={styles.note}>Confirming your payment… complete it in the Razorpay window. This can take a few seconds.</p>
          )}

          {submitErr && <p className={styles.errline}>{submitErr}</p>}

          {SLOT_ERR_CODES.includes(submitCode) || submitCode === 'HOLD_EXPIRED' ? (
            <button className={styles.cta} onClick={pickAnother}>Choose another slot</button>
          ) : (
            <button className={styles.cta} disabled={paying} onClick={pay}>
              {paying ? 'Waiting for payment…' : `Pay ${formatINR(quote.breakdown.totalPaise)}`}
            </button>
          )}
        </div>
      )}

      {tab === 'booking' && step === 'done' && result && (
        <div className={styles.pane}>
          <div className={styles.done}>
            <div className={styles.doneIcon}><CheckCircle size={40} /></div>
            <h2 className={styles.doneTitle}>Booking confirmed</h2>
            <p className={styles.doneSub}>Show this token at the clinic reception.</p>
            <div className={styles.tokenBig}>
              <span className={styles.tokenLabel}>Your token</span>
              <span className={styles.tokenNum}>#{result.tokenNo}</span>
            </div>
            <div className={styles.doneCard}>
              <div className={styles.doneRow}><span>Clinic</span><b>{result.clinicName || clinic.name}</b></div>
              <div className={styles.doneRow}><span>Date</span><b>{dateLabel(result.date)}</b></div>
              <div className={styles.doneRow}><span>Time</span><b>{to12(result.slotStart)} – {to12(result.slotEnd)}</b></div>
              <div className={styles.doneRow}><span>Patient</span><b>{result.patient?.name || name.trim()}</b></div>
            </div>
            <button className={styles.cta} onClick={() => router.push('/bookings')}>View my bookings</button>
            <button className={styles.selfBtn} style={{ marginTop: 12, marginBottom: 0 }} onClick={() => router.push('/explore')}>Back to Explore</button>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className={styles.pane}>
          <p className={styles.about}>{clinic.about}</p>
          {clinic.specialties.length > 0 && (
            <div className={styles.tagRow}>
              {clinic.specialties.map((s) => <span key={s} className={styles.tag}>{s}</span>)}
            </div>
          )}
          {clinic.doctors.length > 0 && (
            <div className={styles.infoList}>
              {clinic.doctors.map((d) => (
                <div key={d.id} className={styles.infoRow}>
                  <Stethoscope size={18} />
                  <div>
                    <p className={styles.infoVal}>{d.name}</p>
                    {d.specialization && <p className={styles.infoLabel}>{d.specialization}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'contact' && (
        <div className={styles.pane}>
          <div className={styles.contact}>
            {clinic.phone && (
              <a className={styles.cRow} href={`tel:${clinic.phone}`}>
                <span className={styles.cIcon}><Phone size={18} /></span>
                <div className={styles.cBody}>
                  <p className={styles.cLabel}>Phone</p>
                  <p className={styles.cVal}>{clinic.phone}</p>
                </div>
                <ChevronRight size={18} className={styles.chev} />
              </a>
            )}
            {clinic.phone2 && (
              <a className={styles.cRow} href={`tel:${clinic.phone2}`}>
                <span className={styles.cIcon}><Phone size={18} /></span>
                <div className={styles.cBody}>
                  <p className={styles.cLabel}>Alternate phone</p>
                  <p className={styles.cVal}>{clinic.phone2}</p>
                </div>
                <ChevronRight size={18} className={styles.chev} />
              </a>
            )}
            {clinic.email && (
              <a className={styles.cRow} href={`mailto:${clinic.email}`}>
                <span className={styles.cIcon}><Mail size={18} /></span>
                <div className={styles.cBody}>
                  <p className={styles.cLabel}>Email</p>
                  <p className={styles.cVal}>{clinic.email}</p>
                </div>
                <ChevronRight size={18} className={styles.chev} />
              </a>
            )}
            <div className={styles.cRow}>
              <span className={styles.cIcon}><MapPin size={18} /></span>
              <div className={styles.cBody}>
                <p className={styles.cLabel}>Address</p>
                <p className={styles.cVal}>{clinic.address}</p>
              </div>
            </div>
            <div className={styles.cRow}>
              <span className={styles.cIcon}><Clock size={18} /></span>
              <div className={styles.cBody}>
                <p className={styles.cLabel}>Opening hours</p>
                <p className={styles.cVal}>{clinic.hours}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
