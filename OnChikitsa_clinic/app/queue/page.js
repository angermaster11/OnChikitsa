'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import {
  Home, Wallet, User, Calendar, ChevronDown, Search,
  Check, X, SkipForward, MoreHorizontal, Clock,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import styles from './queue.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const CalPlus = (p) => (
  <svg width={p.size || 24} height={p.size || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
  </svg>
);
// queue glyph — matches the dashboard / appointments tab
const QueueIc = (p) => (
  <svg width={p.size || 24} height={p.size || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="3" /><path d="M2 20v-1a5 5 0 0 1 10 0v1" /><path d="M15 6h6M15 11h6M15 16h4" />
  </svg>
);

const INIT = [
  { id: 'q1', name: 'Priya Singh', age: 32, gender: 'Female', type: 'Follow-up Consultation', time: '09:30 AM', status: 'waiting' },
  { id: 'q2', name: 'Amit Kumar', age: 45, gender: 'Male', type: 'General Consultation', time: '10:00 AM', status: 'waiting' },
  { id: 'q3', name: 'Sneha Gupta', age: 24, gender: 'Female', type: 'Skin Consultation', time: '10:30 AM', status: 'waiting' },
  { id: 'q4', name: 'Vikash Yadav', age: 38, gender: 'Male', type: 'Dental Checkup', time: '11:00 AM', status: 'waiting' },
  { id: 'q5', name: 'Neha Sharma', age: 27, gender: 'Female', type: 'Follow-up Consultation', time: '11:30 AM', status: 'waiting' },
  { id: 'q6', name: 'Sanjay Mehta', age: 60, gender: 'Male', type: 'General Consultation', time: '12:00 PM', status: 'waiting' },
  { id: 'q7', name: 'Ritu Jain', age: 33, gender: 'Female', type: 'Skin Consultation', time: '12:30 PM', status: 'waiting' },
  { id: 'q8', name: 'Deepak Sharma', age: 29, gender: 'Male', type: 'General Consultation', time: '01:00 PM', status: 'waiting' },
  { id: 'q9', name: 'Rahul Verma', age: 28, gender: 'Male', type: 'General Consultation', time: '08:30 AM', status: 'completed' },
  { id: 'q10', name: 'Kavita Rao', age: 41, gender: 'Female', type: 'Follow-up Consultation', time: '08:00 AM', status: 'completed' },
  { id: 'q11', name: 'Manoj Tiwari', age: 52, gender: 'Male', type: 'General Consultation', time: '08:45 AM', status: 'completed' },
  { id: 'q12', name: 'Rohan Das', age: 36, gender: 'Male', type: 'General Consultation', time: '09:15 AM', status: 'absent' },
];

function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
}

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

export default function QueuePage() {
  const [items, setItems] = useState(INIT);
  const [filter, setFilter] = useState('all');

  const current = items.find((p) => p.status === 'waiting') || null;
  const counts = useMemo(() => ({
    all: items.length,
    waiting: items.filter((p) => p.status === 'waiting').length,
    completed: items.filter((p) => p.status === 'completed').length,
    absent: items.filter((p) => p.status === 'absent').length,
  }), [items]);

  // list = filtered patients, current one pulled into its own card
  const rows = useMemo(() => items
    .filter((p) => p.id !== current?.id)
    .filter((p) => filter === 'all' || p.status === filter), [items, filter, current]);

  const setStatus = (id, status) => { tapLight(); setItems((xs) => xs.map((p) => p.id === id ? { ...p, status } : p)); };
  const skip = (id) => { tapLight(); setItems((xs) => { const x = xs.find((p) => p.id === id); return [...xs.filter((p) => p.id !== id), x]; }); };

  const STAT = [
    { key: 'all', n: counts.all, lbl: 'Total', cls: 'green' },
    { key: 'waiting', n: counts.waiting, lbl: 'Waiting', cls: 'blue' },
    { key: 'completed', n: counts.completed, lbl: 'Completed', cls: 'amber' },
    { key: 'absent', n: counts.absent, lbl: 'Absent', cls: 'red' },
  ];
  const TABS = [
    { key: 'all', label: 'All' }, { key: 'waiting', label: 'Waiting' },
    { key: 'completed', label: 'Completed' }, { key: 'absent', label: 'Absent' },
  ];
  const posOf = (id) => items.filter((p) => p.status === 'waiting').findIndex((p) => p.id === id) + 1;

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Queue</h1>
            <p className={styles.sub}>Manage your patient queue</p>
          </div>
          <button className={styles.datePill}>
            <Calendar size={15} />Today, 26 Sep 2026<ChevronDown size={14} />
          </button>
        </header>

        <div className={styles.stats}>
          {STAT.map((s) => (
            <button key={s.key} className={`${styles.stat} ${styles['s_' + s.cls]} ${filter === s.key ? styles.statOn : ''}`}
              onClick={() => { tapLight(); setFilter(s.key); }}>
              <span className={styles.statN}>{s.n}</span>
              <span className={styles.statL}>{s.lbl}</span>
            </button>
          ))}
        </div>

        {current && (
          <section className={styles.current}>
            <div className={styles.curTop}>
              <span className={styles.curTag}><i className={styles.liveDot} />Current Patient</span>
              <span className={styles.curBadge}>Queue #{posOf(current.id)}</span>
            </div>
            <div className={styles.curBody}>
              <span className={styles.curAv}>{initials(current.name)}</span>
              <div className={styles.curInfo}>
                <span className={styles.curName}>{current.name}</span>
                <span className={styles.curMeta}>{current.age} yrs • {current.gender}</span>
                <span className={styles.curType}>{current.type}</span>
              </div>
              <div className={styles.curTime}>
                <span className={styles.curClock}><Clock size={13} />{current.time}</span>
                <span className={styles.curTimeLbl}>Scheduled Time</span>
              </div>
            </div>
            <div className={styles.curActions}>
              <button className={`${styles.act} ${styles.actSkip}`} onClick={() => skip(current.id)}>
                <SkipForward size={16} />Skip
              </button>
              <button className={`${styles.act} ${styles.actDone}`} onClick={() => setStatus(current.id, 'completed')}>
                <Check size={16} />Completed
              </button>
              <button className={`${styles.act} ${styles.actAbsent}`} onClick={() => setStatus(current.id, 'absent')}>
                <X size={16} />Absent
              </button>
            </div>
          </section>
        )}

        <div className={styles.listHead}>
          <h2 className={styles.listTitle}>Queue List <span>({rows.length})</span></h2>
          <div className={styles.listActs}>
            <button className={styles.iconGhost} aria-label="Search queue"><Search size={17} /></button>
            <button className={styles.reorder}>Reorder</button>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t.key} className={`${styles.qtab} ${filter === t.key ? styles.qtabOn : ''}`}
              onClick={() => { tapLight(); setFilter(t.key); }}>
              {t.label} <span className={styles.qtabN}>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {rows.map((p) => (
            <div key={p.id} className={styles.row}>
              <span className={`${styles.num} ${styles['num_' + p.status]}`}>
                {p.status === 'waiting' ? posOf(p.id) : p.status === 'completed' ? <Check size={15} /> : <X size={15} />}
              </span>
              <span className={styles.rAv}>{initials(p.name)}</span>
              <span className={styles.rMid}>
                <span className={styles.rName}>{p.name}</span>
                <span className={styles.rMeta}>{p.age} yrs • {p.gender}</span>
                <span className={styles.rType}>{p.type}</span>
              </span>
              <span className={styles.rEnd}>
                <span className={styles.rTime}>{p.time}</span>
                <span className={`${styles.rPill} ${styles['rp_' + p.status]}`}>
                  {p.status === 'waiting' ? 'Waiting' : p.status === 'completed' ? 'Completed' : 'Absent'}
                </span>
              </span>
              <button className={styles.kebab} aria-label="More"><MoreHorizontal size={18} /></button>
            </div>
          ))}
          {rows.length === 0 && <div className={styles.empty}>No patients in this list.</div>}
        </div>
      </div>

      <TabBar active="queue" />
    </main>
  );
}

