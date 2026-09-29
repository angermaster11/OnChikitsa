'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MapPin, Bell, ChevronRight, Settings, Stethoscope, Clock,
  CalPlus, QueueIc, Locate, CheckCircle, Calendar,
} from '../_components/icons';
import BottomNav from '../_components/BottomNav';
import { tapLight } from '../_lib/haptic';
import { flow } from '../_lib/flow';
import { clinicApi, appointmentApi } from '../_lib/api';
import styles from './dashboard.module.css';

// Backend status (UPPERCASE) → schedule pill label + colour class.
const PILL = {
  BOOKED:     { label: 'Upcoming',   cls: 'pillGrey' },
  ARRIVED:    { label: 'Arrived',    cls: 'pillBlue' },
  CONSULTING: { label: 'Consulting', cls: 'pillAmber' },
  COMPLETED:  { label: 'Completed',  cls: 'pillGreen' },
  CANCELLED:  { label: 'Cancelled',  cls: 'pillGrey' },
  NO_SHOW:    { label: 'No-show',    cls: 'pillGrey' },
};

/** Local YYYY-MM-DD (never UTC — the backend stores plain calendar days). */
function ymd(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
/** "HH:MM" (24h) → "H:MM AM/PM". */
function to12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
/** "HH:MM" → minutes since midnight (for "from now" comparisons). */
function toMin(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'DR';
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const QA = [
  { t: 'New Appointment', Ico: CalPlus, route: '/appointments/create' },
  { t: 'Patients', Ico: Users, route: '/patients' },
  { t: 'Consultations', Ico: Stethoscope, route: '/appointments' },
  { t: 'Clinic Settings', Ico: Settings, route: '/settings' },
];

export default function Dashboard() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };

  // Current location via GPS. navigator.geolocation gives coords; a client-side
  // reverse-geocode turns them into a readable place. Degrades gracefully when
  // permission is denied / unavailable, so the header always renders.
  const [loc, setLoc] = useState('Locating…');
  const [locState, setLocState] = useState('busy'); // busy | ok | off

  // Real dashboard data: clinic profile (greeting) + today's appointments.
  const [me, setMe] = useState(null);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const detect = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLoc('Location unavailable'); setLocState('off'); return;
    }
    setLoc('Locating…'); setLocState('busy');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`,
          );
          const j = await r.json();
          const label = [j.locality || j.city, j.principalSubdivision].filter(Boolean).join(', ');
          setLoc(label || 'Current location'); setLocState('ok');
        } catch {
          setLoc('Current location'); setLocState('ok');
        }
      },
      () => { setLoc('Enable location'); setLocState('off'); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => { detect(); }, [detect]);

  // Auth gate: an unauthenticated visitor never sees the dashboard — send them
  // to login. flow.isAuthed() reads localStorage, so this runs client-side only.
  useEffect(() => { if (!flow.isAuthed()) router.replace('/login'); }, [router]);

  // Load real data once authed: the clinic profile (for the greeting) and today's
  // appointments (for the stat counts and the live/next schedule).
  useEffect(() => {
    if (!flow.isAuthed()) return; // the auth gate above handles the redirect
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      const [profile, items] = await Promise.all([
        clinicApi.getMe().catch(() => null),
        appointmentApi.list({ date: ymd(new Date()) }).catch((e) => {
          if (alive) setError(e?.message || 'Could not load appointments.');
          return [];
        }),
      ]);
      if (!alive) return;
      setMe(profile);
      setAppts(Array.isArray(items) ? items : (items?.items || []));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Derived, real figures. "Upcoming" = live now (arrived/consulting) + still-to-come
  // booked slots (slot end not yet passed), earliest first.
  const clinicName = me?.name || '';
  const patientsCount = appts.length;
  const completedCount = appts.filter((a) => a.status === 'COMPLETED').length;
  const inQueue = appts.filter((a) => a.status === 'ARRIVED' || a.status === 'CONSULTING').length;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcomingBooked = appts.filter(
    (a) => a.status === 'BOOKED' && toMin(a.slotEnd || a.slotStart) >= nowMin,
  ).length;
  const upcoming = appts
    .filter((a) => {
      if (a.status === 'ARRIVED' || a.status === 'CONSULTING') return true;        // live now
      if (a.status === 'BOOKED') return toMin(a.slotEnd || a.slotStart) >= nowMin;  // still to come
      return false;                                                                // done / cancelled / no-show
    })
    .sort((a, b) => toMin(a.slotStart) - toMin(b.slotStart))
    .slice(0, 6);

  return (
    <main className={styles.root}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div className={styles.headTop}>
            <div className={styles.headL}>
              <h1 className={styles.hi}>{greeting()}{clinicName ? `, ${clinicName}` : ''}</h1>
              <button
                className={`${styles.loc} ${locState === 'busy' ? styles.locBusy : ''}`}
                onClick={() => { tapLight(); detect(); }}
                aria-label="Detect current location">
                <MapPin size={14} /><span>{loc}</span><Locate size={13} className={styles.locGps} />
              </button>
            </div>
            <div className={styles.headActs}>
              <button className={styles.bell} onClick={go('/notifications')} aria-label="Notifications">
                <Bell size={20} /><i className={styles.dot} />
              </button>
              <button className={styles.avatar} onClick={go('/profile')} aria-label="Clinic profile">
                <span className={styles.avatarTxt}>{initials(clinicName)}</span>
              </button>
            </div>
          </div>
        </header>

        <section className={styles.stats}>
          <button className={styles.stat} onClick={go('/appointments')}>
            <span className={`${styles.statIc} ${styles.icTeal}`}><Users size={20} /></span>
            <ChevronRight size={18} className={styles.statChev} />
            <span className={styles.statNum}>{loading ? '—' : patientsCount}</span>
            <span className={styles.statLbl}>Today&apos;s Patients</span>
            <span className={`${styles.statFoot} ${styles.footTeal}`}><CheckCircle size={13} />{completedCount} completed</span>
          </button>
          <button className={styles.stat} onClick={go('/queue')}>
            <span className={`${styles.statIc} ${styles.icBlue}`}><QueueIc size={20} /></span>
            <ChevronRight size={18} className={styles.statChev} />
            <span className={styles.statNum}>{loading ? '—' : inQueue}</span>
            <span className={styles.statLbl}>In Queue</span>
            <span className={`${styles.statFoot} ${styles.footMuted}`}><Clock size={13} />{upcomingBooked} upcoming</span>
          </button>
        </section>

        <section className={styles.qa}>
          {QA.map(({ t, Ico, route }) => (
            <button key={t} className={styles.qaTile} onClick={go(route)}>
              <span className={styles.qaIc}><Ico size={22} /></span>
              <span className={styles.qaLbl}>{t}</span>
            </button>
          ))}
        </section>

        <section className={styles.sched}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Today&apos;s Schedule</h2>
            <button className={styles.viewAll} onClick={go('/appointments')}>View All<ChevronRight size={15} /></button>
          </div>
          <div className={styles.schedList}>
            {loading && <div className={styles.schedEmpty}>Loading today’s schedule…</div>}
            {!loading && error && <div className={styles.schedEmpty}>{error}</div>}
            {!loading && !error && upcoming.length === 0 && (
              <div className={styles.schedEmpty}>
                <Calendar size={22} />
                <span>No more schedule for today</span>
              </div>
            )}
            {!loading && !error && upcoming.map((a) => {
              const m = PILL[a.status] || { label: a.status, cls: 'pillGrey' };
              const [tt, ap] = to12(a.slotStart).split(' ');
              const p = a.patient || {};
              const sub = [`Token #${a.tokenNo}`, a.reason].filter(Boolean).join(' · ');
              return (
                <button key={a._id} className={styles.schedRow} onClick={go(`/appointments/detail?id=${a._id}`)}>
                  <span className={styles.timeChip}>{tt}<b>{ap}</b></span>
                  <span className={styles.schedMid}>
                    <span className={styles.schedName}>{p.name || 'Patient'}</span>
                    <span className={styles.schedType}>{sub}</span>
                  </span>
                  <span className={styles.schedEnd}>
                    <span className={`${styles.pill} ${styles[m.cls]}`}><i />{m.label}</span>
                    <ChevronRight size={16} className={styles.rowChev} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.promo} onClick={go('/settings')} role="button">
          <div className={styles.promoTxt}>
            <h3 className={styles.promoTitle}>Manage your clinic effortlessly</h3>
            <p className={styles.promoSub}>Track patients, queue and earnings all in one place.</p>
            <span className={styles.promoCta}>Explore tools<ChevronRight size={15} /></span>
          </div>
          <span className={styles.promoIc}><Stethoscope size={28} /></span>
        </section>
      </div>

      <BottomNav active="home" />
    </main>
  );
}
