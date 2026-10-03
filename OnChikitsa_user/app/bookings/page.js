'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Calendar, Ticket, Home, Compass, User, AlertCircle, ChevronRight, Clipboard, Check, Star,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { flow } from '../_lib/flow';
import { getCurrentUser } from '../_lib/auth';
import { bookingApi, reviewApi, ApiError } from '../_lib/api';
import { mapBooking } from '../_lib/clinicMap';
import styles from './bookings.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
// Upcoming statuses → the pill tint (BOOKED = confirmed, then live progression).
const PILL_CLASS = { PENDING_PAYMENT: 'pillPending', BOOKED: 'pillBooked', ARRIVED: 'pillArrived', CONSULTING: 'pillConsulting' };
// Past outcomes → the badge tint.
const PAST_CLASS = { completed: 'ok', cancelled: 'cancel', missed: 'miss', incomplete: 'incomplete' };
const PAST_LABEL = { completed: 'Completed', cancelled: 'Cancelled', missed: 'Missed', incomplete: 'Payment not completed' };

// Copy text to the clipboard, with a execCommand fallback for older WebViews.
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Tappable appointment ID that copies itself. Inherits the surrounding text style.
function CopyId({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };
  return (
    <button type="button" className={styles.copyId} onClick={copy} aria-label={`Copy appointment ID ${code}`}>
      <span>{code}</span>
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
    </button>
  );
}

export default function Bookings() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState('');
  const [cancelErr, setCancelErr] = useState('');
  const [detail, setDetail] = useState(null); // the past booking shown in the detail sheet

  // Fetch both scopes from the backend and map to card shapes. Reused after a
  // cancel and whenever the app returns to the foreground (so a clinic-side
  // status change — checked in / in consultation / missed — shows up live).
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [up, pa] = await Promise.all([bookingApi.listMine('upcoming'), bookingApi.listMine('past')]);
      setUpcoming((up || []).map(mapBooking));
      setPast((pa || []).map(mapBooking));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fast auth gate + onboarding guard, then load the caller's real bookings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      await load();
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on the bookings screen */ }
    })();
    return () => { cancelled = true; };
  }, [router, load]);

  // Refetch when the app comes back to the foreground so clinic-side status
  // changes (checked in, in consultation, missed) appear without a manual reload.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  const cancel = async (id) => {
    setCancelId(id); setCancelErr('');
    try {
      await bookingApi.cancel(id);
      await load();
    } catch (err) {
      setCancelErr(err instanceof ApiError ? err.message : 'Could not cancel. Please try again.');
    } finally {
      setCancelId('');
    }
  };

  // Resume an unpaid hold: jump back to that clinic's booking page to finish paying.
  // The backend releases this stale hold when the slot is re-booked, so retry is clean.
  const completePayment = (b) => {
    if (b.clinicId) flow.setClinicId(b.clinicId);
    router.push('/clinic');
  };

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  const listFor = tab === 'upcoming' ? upcoming : past;

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <h1 className={styles.title}>Bookings</h1>
        <p className={styles.sub}>Your upcoming appointments and past visits</p>
      </header>

      <div className={styles.tabs} role="tablist">
        <button className={`${styles.tabBtn} ${tab === 'upcoming' ? styles.on : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={`${styles.tabBtn} ${tab === 'past' ? styles.on : ''}`} onClick={() => setTab('past')}>Past</button>
      </div>

      {cancelErr && tab === 'upcoming' && <p className={styles.cancelErr}>{cancelErr}</p>}

      {loading ? (
        <p className={styles.loadTxt}>Loading your bookings…</p>
      ) : error ? (
        <Empty icon={<AlertCircle size={26} />} title="Couldn’t load bookings" sub={error} danger />
      ) : listFor.length === 0 ? (
        tab === 'upcoming'
          ? <Empty icon={<Ticket size={26} />} title="No upcoming bookings" sub="Book a clinic from Explore to see it here." />
          : <Empty icon={<Clock size={26} />} title="No past visits" sub="Your completed and cancelled bookings will show up here." />
      ) : (
        <div className={styles.list}>
          {tab === 'upcoming'
            ? upcoming.map((b) => <UpcomingCard key={b.id} b={b} onCancel={cancel} cancelling={cancelId === b.id} onComplete={completePayment} />)
            : past.map((b) => <PastCard key={b.id} b={b} onOpen={setDetail} />)}
        </div>
      )}

      {detail && <BookingDetail b={detail} onClose={() => setDetail(null)} />}

      <nav className={styles.tabbar}>
        <button className={styles.tab} onClick={() => router.push('/dashboard')}><Home size={22} /> Home</button>
        <button className={styles.tab} onClick={() => router.push('/explore')}><Compass size={22} /> Explore</button>
        <button className={`${styles.tab} ${styles.active}`}><Ticket size={22} /> Bookings</button>
        <button className={styles.tab} onClick={() => router.push('/profile')}><User size={22} /> Profile</button>
      </nav>
    </main>
  );
}

// An upcoming booking: the live status is the hero (prominent pill), with the
// token, date/slot and an expected-time row below. Cancel is deliberately
// de-emphasised — a small link up by the status — and only actually cancels after
// an inline confirm step. A PENDING_PAYMENT hold shows as "Payment pending" with a
// Complete-payment action instead — no token yet (assigned on confirmation).
function UpcomingCard({ b, onCancel, cancelling, onComplete }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  const [confirming, setConfirming] = useState(false);
  return (
    <article className={styles.liveCard}>
      <div className={styles.cardHead}>
        <span className={`${styles.logo} ${styles[b.g]}`}><Glyph size={26} /></span>
        <div className={styles.hBody}>
          <h2 className={styles.name}>{b.clinic}</h2>
          {b.area && <p className={styles.meta}>{b.area}</p>}
          {b.code && <p className={styles.apptId}>ID · <CopyId code={b.code} /></p>}
        </div>
        <div className={styles.headRight}>
          <span className={`${styles.stPill} ${styles.stPillLg} ${b.skipped ? styles.pillSkipped : (styles[PILL_CLASS[b.status]] || '')}`}>
            {b.skipped ? 'Skipped' : b.statusLabel}
          </span>
        </div>
      </div>

      <div className={styles.tokenRow}>
        <Ticket size={16} />
        <span className={styles.tokenTxt}>Token</span>
        <span className={styles.tokenNo}>{b.pendingPayment ? '—' : `#${b.token}`}</span>
      </div>

      <div className={styles.times}>
        <div className={styles.timeCell}>
          <Calendar size={18} />
          <div><p className={styles.tLabel}>Date</p><p className={styles.tVal}>{b.dateLabel}</p></div>
        </div>
        <div className={styles.timeCell}>
          <Clock size={18} />
          <div><p className={styles.tLabel}>Time</p><p className={styles.tVal}>{b.timeLabel}</p></div>
        </div>
      </div>

      {!b.pendingPayment && (
        <div className={styles.expectRow}>
          <Clock size={16} />
          <span className={styles.expectTxt}>Expected time</span>
          <span className={styles.expectVal}>{b.expectedTime || '—'}</span>
        </div>
      )}

      {b.skipped && (
        <p className={styles.skipNote}>The clinic moved you further down the queue for now — please stay nearby, you’ll be called again shortly.</p>
      )}

      {!b.pendingPayment && b.tokenValidUntilLabel && (
        <p className={styles.rebookNote}>Free re-book with ID {b.code} until {b.tokenValidUntilLabel}.</p>
      )}

      {b.pendingPayment ? (
        <>
          <p className={styles.pendingNote}>Payment not completed yet — finish paying to confirm this slot.</p>
          <button className={styles.payBtn} onClick={() => onComplete(b)}>Complete payment</button>
        </>
      ) : confirming ? (
        <div className={styles.confirmBox}>
          <p className={styles.confirmQ}>Cancel this booking? This can’t be undone.</p>
          <div className={styles.confirmActions}>
            <button className={styles.keepBtn} disabled={cancelling} onClick={() => setConfirming(false)}>Keep it</button>
            <button className={styles.confirmCancelBtn} disabled={cancelling} onClick={() => onCancel(b.id)}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </div>
      ) : b.cancellable ? (
        <div className={styles.cancelRow}>
          <button className={styles.cancelLink} onClick={() => setConfirming(true)}>Cancel booking</button>
        </div>
      ) : null}
    </article>
  );
}

function PastCard({ b, onOpen }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  return (
    <button type="button" className={styles.pastCard} onClick={() => onOpen(b)} aria-label={`View ${b.clinic} booking details`}>
      <span className={`${styles.pastLogo} ${styles[b.g]}`}><Glyph size={24} /></span>
      <div className={styles.pastBody}>
        <h2 className={styles.pastName}>{b.clinic}</h2>
        <p className={styles.pastMeta}>{b.dateLabel} · {b.timeLabel}</p>
      </div>
      <span className={`${styles.pastBadge} ${styles[PAST_CLASS[b.outcome]] || styles.ok}`}>
        {PAST_LABEL[b.outcome] || b.statusLabel}
      </span>
      <ChevronRight size={18} className={styles.pastChev} />
    </button>
  );
}

// Tap a past booking → a bottom sheet with the full record.
function BookingDetail({ b, onClose }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  const demo = [b.age != null ? `${b.age} yrs` : null, b.gender].filter(Boolean).join(' · ');
  const rows = [
    ['Appointment ID', <CopyId key="code" code={b.code} />],
    ['Token', b.token ? `#${b.token}` : '—'],
    ['Status', PAST_LABEL[b.outcome] || b.statusLabel],
    ['Date', b.dateLabel],
    ['Time', b.timeLabel],
    ['Patient', b.patient],
    demo ? ['Age / Gender', demo] : null,
    b.phone ? ['Phone', b.phone] : null,
    b.reason ? ['Reason', b.reason] : null,
    b.area ? ['Location', b.area] : null,
    b.cancelledBy ? ['Cancelled by', b.cancelledBy === 'CLINIC' ? 'Clinic' : 'You'] : null,
  ].filter(Boolean);
  return (
    <div className={styles.sheetWrap} role="dialog" aria-modal="true" aria-label="Booking details">
      <button type="button" className={styles.sheetBackdrop} aria-label="Close" onClick={onClose} />
      <div className={styles.sheet}>
        <span className={styles.sheetGrip} aria-hidden="true" />
        <div className={styles.sheetHead}>
          <span className={`${styles.sheetLogo} ${styles[b.g]}`}><Glyph size={26} /></span>
          <div className={styles.sheetHeadBody}>
            <h2 className={styles.sheetTitle}>{b.clinic}</h2>
            {b.area && <p className={styles.sheetSub}>{b.area}</p>}
          </div>
          <span className={`${styles.pastBadge} ${styles[PAST_CLASS[b.outcome]] || styles.ok}`}>
            {PAST_LABEL[b.outcome] || b.statusLabel}
          </span>
        </div>
        <dl className={styles.sheetRows}>
          {rows.map(([k, v]) => (
            <div key={k} className={styles.sheetRow}>
              <dt className={styles.sheetKey}>{k}</dt>
              <dd className={styles.sheetVal}>{v}</dd>
            </div>
          ))}
        </dl>
        {b.tokenValidUntilLabel && b.outcome === 'completed' && (
          <p className={styles.rebookNote}>Free re-book with ID {b.code} until {b.tokenValidUntilLabel}.</p>
        )}
        {b.outcome === 'completed' && <RateVisit b={b} />}
        <button className={styles.sheetClose} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// Rate a completed visit (1–5 stars + optional feedback). Prefills the patient's
// existing review if they already rated this appointment, so re-opening edits it.
// Anonymous end-to-end: the backend never associates the review back to the patient
// in any response.
function RateVisit({ b }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await reviewApi.mine(b.id);
        if (!cancelled && mine) { setRating(mine.rating || 0); setComment(mine.comment || ''); setSaved(true); }
      } catch { /* no existing review — fresh form */ }
    })();
    return () => { cancelled = true; };
  }, [b.id]);

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true); setErr('');
    try {
      await reviewApi.submit(b.id, { rating, comment: comment.trim() || undefined });
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not save your rating. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.rate}>
      <p className={styles.rateTitle}>{saved ? 'Your rating' : 'Rate your visit'}</p>
      <div className={styles.rateStars} role="radiogroup" aria-label="Rating out of 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={styles.rateStar}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-checked={n === rating}
            role="radio"
            onClick={() => setRating(n)}
            style={{ color: n <= rating ? '#f5a623' : '#d4d4db' }}
          >
            <Star size={30} />
          </button>
        ))}
      </div>
      <textarea
        className={styles.rateText}
        value={comment}
        maxLength={1000}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share a little about your visit (optional)"
      />
      {err && <p className={styles.rateErr} role="alert">{err}</p>}
      {saved && !err && <p className={styles.rateOk}>Thanks — your feedback is saved.</p>}
      <button className={styles.payBtn} onClick={submit} disabled={!rating || busy}>
        {busy ? 'Saving…' : saved ? 'Update rating' : 'Submit rating'}
      </button>
    </div>
  );
}

function Empty({ icon, title, sub, danger }) {
  return (
    <div className={styles.empty}>
      <span className={`${styles.emptyIcon} ${danger ? styles.emptyDanger : ''}`}>{icon}</span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySub}>{sub}</p>
    </div>
  );
}
