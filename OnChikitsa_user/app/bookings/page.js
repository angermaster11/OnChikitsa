'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Calendar, Ticket, Home, Compass, User, AlertCircle,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { flow } from '../_lib/flow';
import { getCurrentUser } from '../_lib/auth';
import { bookingApi, ApiError } from '../_lib/api';
import { mapBooking } from '../_lib/clinicMap';
import styles from './bookings.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
// Upcoming statuses → the pill tint (BOOKED = confirmed, then live progression).
const PILL_CLASS = { PENDING_PAYMENT: 'pillPending', BOOKED: 'pillBooked', ARRIVED: 'pillArrived', CONSULTING: 'pillConsulting' };
// Past outcomes → the badge tint.
const PAST_CLASS = { completed: 'ok', cancelled: 'cancel', missed: 'miss', incomplete: 'incomplete' };
const PAST_LABEL = { completed: 'Completed', cancelled: 'Cancelled', missed: 'Missed', incomplete: 'Payment not completed' };

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
            : past.map((b) => <PastCard key={b.id} b={b} />)}
        </div>
      )}

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
          {b.code && <p className={styles.apptId}>ID · {b.code}</p>}
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

function PastCard({ b }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  return (
    <article className={styles.pastCard}>
      <span className={`${styles.pastLogo} ${styles[b.g]}`}><Glyph size={24} /></span>
      <div className={styles.pastBody}>
        <h2 className={styles.pastName}>{b.clinic}</h2>
        <p className={styles.pastMeta}>{b.dateLabel} · {b.timeLabel}</p>
      </div>
      <span className={`${styles.pastBadge} ${styles[PAST_CLASS[b.outcome]] || styles.ok}`}>
        {PAST_LABEL[b.outcome] || b.statusLabel}
      </span>
    </article>
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
