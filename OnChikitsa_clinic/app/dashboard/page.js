'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import {
  Home, Users, Wallet, User, MapPin, Bell, ChevronRight,
  Settings, Stethoscope, TrendingUp, Clock,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import { flow } from '../_lib/flow';
import styles from './dashboard.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

// calendar-with-plus glyph the shared set doesn't carry
const CalPlus = (p) => (
  <svg width={p.size || 24} height={p.size || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
  </svg>
);
// queue glyph — a person with people lined up behind
const QueueIc = (p) => (
  <svg width={p.size || 24} height={p.size || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="3" /><path d="M2 20v-1a5 5 0 0 1 10 0v1" /><path d="M15 6h6M15 11h6M15 16h4" />
  </svg>
);
// gps crosshair — affordance for "tap to detect current location"
const Locate = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" /><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
  </svg>
);

const SCHEDULE = [
  { time: '09:00 AM', name: 'Rahul Verma', type: 'General Consultation', status: 'completed' },
  { time: '09:30 AM', name: 'Priya Singh', type: 'Follow-up', status: 'inqueue' },
  { time: '10:00 AM', name: 'Amit Kumar', type: 'General Consultation', status: 'upcoming' },
  { time: '10:30 AM', name: 'Sneha Gupta', type: 'Skin Consultation', status: 'upcoming' },
];
const STATUS = {
  completed: { label: 'Completed', pill: 'pillGreen' },
  inqueue: { label: 'In Queue', pill: 'pillBlue' },
  upcoming: { label: 'Upcoming', pill: 'pillGrey' },
};

const QA = [
  { t: 'New Appointment', Ico: CalPlus, route: '/appointments/create' },
  { t: 'Patients', Ico: Users, route: '/patients' },
  { t: 'Consultations', Ico: Stethoscope, route: '/appointments' },
  { t: 'Clinic Settings', Ico: Settings, route: '/settings' },
];

function TabBar({ active }) {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };
  const tabs = [
    ['home', 'Home', Home, '/dashboard'],
    ['appts', 'Appointments', CalPlus, '/appointments'],
    ['queue', 'Queue', QueueIc, '/queue'],
    ['wallet', 'Wallet', Wallet, '/earnings'],
    ['profile', 'Profile', User, '/profile'],
  ];
  return (
    <nav className={styles.tabbar}>
      {tabs.map(([k, l, Ic, r]) => (
        <button key={k} className={`${styles.tab} ${active === k ? styles.tabOn : ''}`}
          onClick={active === k ? undefined : go(r)} aria-current={active === k ? 'page' : undefined}>
          <span className={styles.tabIc}><Ic size={21} /></span>{l}
        </button>
      ))}
    </nav>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };

  // Current location via GPS. navigator.geolocation gives coords; a client-side
  // reverse-geocode turns them into a readable place. Degrades gracefully when
  // permission is denied / unavailable, so the header always renders.
  const [loc, setLoc] = useState('Locating…');
  const [locState, setLocState] = useState('busy'); // busy | ok | off

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

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div className={styles.headTop}>
            <div className={styles.headL}>
              <h1 className={styles.hi}>Good morning, Dr. Sharma</h1>
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
                <span className={styles.avatarTxt}>DS</span>
              </button>
            </div>
          </div>
        </header>

        <section className={styles.stats}>
          <button className={styles.stat} onClick={go('/appointments')}>
            <span className={`${styles.statIc} ${styles.icTeal}`}><Users size={20} /></span>
            <ChevronRight size={18} className={styles.statChev} />
            <span className={styles.statNum}>12</span>
            <span className={styles.statLbl}>Today&apos;s Patients</span>
            <span className={`${styles.statFoot} ${styles.footTeal}`}><TrendingUp size={13} />+3 vs yesterday</span>
          </button>
          <button className={styles.stat} onClick={go('/queue')}>
            <span className={`${styles.statIc} ${styles.icBlue}`}><QueueIc size={20} /></span>
            <ChevronRight size={18} className={styles.statChev} />
            <span className={styles.statNum}>#3</span>
            <span className={styles.statLbl}>Current Queue</span>
            <span className={`${styles.statFoot} ${styles.footMuted}`}><Clock size={13} />~25 min wait</span>
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
            {SCHEDULE.map((s) => {
              const m = STATUS[s.status];
              return (
                <button key={s.time + s.name} className={styles.schedRow} onClick={go('/appointments')}>
                  <span className={styles.timeChip}>
                    {s.time.split(' ')[0]}<b>{s.time.split(' ')[1]}</b>
                  </span>
                  <span className={styles.schedMid}>
                    <span className={styles.schedName}>{s.name}</span>
                    <span className={styles.schedType}>{s.type}</span>
                  </span>
                  <span className={styles.schedEnd}>
                    <span className={`${styles.pill} ${styles[m.pill]}`}><i />{m.label}</span>
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

      <TabBar active="home" />
    </main>
  );
}
