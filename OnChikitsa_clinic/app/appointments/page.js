'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import {
  Home, Wallet, User, Search, Filter, ChevronRight, Phone,
  Plus, Stethoscope, RefreshCw, HeartPulse, Tooth,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import styles from './appointments.module.css';

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
// queue glyph — matches the dashboard tab (a person with people lined up behind)
const QueueIc = (p) => (
  <svg width={p.size || 24} height={p.size || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="3" /><path d="M2 20v-1a5 5 0 0 1 10 0v1" /><path d="M15 6h6M15 11h6M15 16h4" />
  </svg>
);

const TYPE_ICON = { General: Stethoscope, 'Follow-up': RefreshCw, Skin: HeartPulse, Dental: Tooth };
const STATUS = {
  completed: { label: 'Completed', cls: 'green' },
  inqueue: { label: 'In Queue', cls: 'blue' },
  upcoming: { label: 'Upcoming', cls: 'grey' },
};

const APPTS = [
  { id: 'A-101', name: 'Manoj Tiwari', age: 52, gender: 'Male', phone: '+91 98100 22114', type: 'General', time: '08:00 AM', status: 'completed' },
  { id: 'A-102', name: 'Kavita Rao', age: 41, gender: 'Female', phone: '+91 90045 11882', type: 'Follow-up', time: '08:30 AM', status: 'completed' },
  { id: 'A-103', name: 'Rahul Verma', age: 28, gender: 'Male', phone: '+91 98765 43210', type: 'General', time: '09:00 AM', status: 'completed' },
  { id: 'A-104', name: 'Priya Singh', age: 32, gender: 'Female', phone: '+91 91234 56789', type: 'Follow-up', time: '09:30 AM', status: 'inqueue' },
  { id: 'A-105', name: 'Deepak Sharma', age: 29, gender: 'Male', phone: '+91 99870 55231', type: 'General', time: '09:45 AM', status: 'inqueue' },
  { id: 'A-106', name: 'Anjali Nair', age: 35, gender: 'Female', phone: '+91 90881 20034', type: 'Skin', time: '10:15 AM', status: 'inqueue' },
  { id: 'A-107', name: 'Amit Kumar', age: 45, gender: 'Male', phone: '+91 99887 76655', type: 'General', time: '10:00 AM', status: 'upcoming' },
  { id: 'A-108', name: 'Sneha Gupta', age: 24, gender: 'Female', phone: '+91 90000 12345', type: 'Skin', time: '10:30 AM', status: 'upcoming' },
  { id: 'A-109', name: 'Vikash Yadav', age: 38, gender: 'Male', phone: '+91 98111 22333', type: 'Dental', time: '11:00 AM', status: 'upcoming' },
  { id: 'A-110', name: 'Neha Sharma', age: 27, gender: 'Female', phone: '+91 90210 44556', type: 'Follow-up', time: '11:30 AM', status: 'upcoming' },
  { id: 'A-111', name: 'Sanjay Mehta', age: 60, gender: 'Male', phone: '+91 98330 77120', type: 'General', time: '12:00 PM', status: 'upcoming' },
  { id: 'A-112', name: 'Ritu Jain', age: 33, gender: 'Female', phone: '+91 90567 88991', type: 'Skin', time: '12:30 PM', status: 'upcoming' },
];

const DAYS = [
  { dow: 'Tue', d: 26, mo: 'Sep' }, { dow: 'Wed', d: 27, mo: 'Sep' }, { dow: 'Thu', d: 28, mo: 'Sep' },
  { dow: 'Fri', d: 29, mo: 'Sep' }, { dow: 'Sat', d: 30, mo: 'Sep' }, { dow: 'Sun', d: 1, mo: 'Oct' },
  { dow: 'Mon', d: 2, mo: 'Oct' },
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

function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
}

export default function Appointments() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };
  const [day, setDay] = useState(0);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => ({
    all: APPTS.length,
    upcoming: APPTS.filter((a) => a.status === 'upcoming').length,
    inqueue: APPTS.filter((a) => a.status === 'inqueue').length,
    completed: APPTS.filter((a) => a.status === 'completed').length,
    cancelled: 0,
  }), []);

  const chips = [
    { key: 'all', label: 'All' }, { key: 'upcoming', label: 'Upcoming' },
    { key: 'inqueue', label: 'In Queue' }, { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return APPTS.filter((a) => filter === 'all' || a.status === filter)
      .filter((a) => !term || a.name.toLowerCase().includes(term) || a.phone.includes(term));
  }, [filter, q]);

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div className={styles.headTxt}>
            <h1 className={styles.title}>Appointments</h1>
            <p className={styles.sub}>Manage your clinic appointments</p>
          </div>
          <button className={styles.create} onClick={go('/appointments/create')}>
            <Plus size={18} />Create
          </button>
        </header>

        <div className={styles.searchRow}>
          <div className={styles.search}>
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search patients..." aria-label="Search patients" />
          </div>
          <button className={styles.filterBtn} aria-label="Filter"><Filter size={19} /></button>
        </div>

        <div className={styles.dateStrip}>
          {DAYS.map((dd, i) => (
            <button key={dd.dow + dd.d} className={`${styles.dayCard} ${day === i ? styles.dayOn : ''}`}
              onClick={() => { tapLight(); setDay(i); }}>
              <span className={styles.dayDow}>{dd.dow}</span>
              <span className={styles.dayNum}>{dd.d}</span>
              <span className={styles.dayMo}>{dd.mo}</span>
            </button>
          ))}
        </div>

        <div className={styles.chips}>
          {chips.map((c) => (
            <button key={c.key} className={`${styles.chip} ${filter === c.key ? styles.chipOn : ''}`}
              onClick={() => { tapLight(); setFilter(c.key); }}>
              {c.label} <span className={styles.chipN}>{counts[c.key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {list.map((a) => {
            const m = STATUS[a.status];
            const Ti = TYPE_ICON[a.type] || Stethoscope;
            return (
              <button key={a.id} className={styles.card} onClick={go(`/appointments/detail?id=${a.id}`)}>
                <span className={`${styles.timeBlk} ${styles['tb_' + m.cls]}`}>
                  {a.time.split(' ')[0]}<b>{a.time.split(' ')[1]}</b>
                </span>
                <span className={`${styles.av} ${styles['av_' + m.cls]}`}>{initials(a.name)}</span>
                <span className={styles.mid}>
                  <span className={styles.name}>{a.name}</span>
                  <span className={styles.meta}>{a.age} yrs • {a.gender}</span>
                  <span className={styles.phone}><Phone size={12} />{a.phone}</span>
                  <span className={styles.type}><Ti size={13} />{a.type} Consultation</span>
                </span>
                <span className={styles.end}>
                  <span className={`${styles.pill} ${styles['pill_' + m.cls]}`}><i />{m.label}</span>
                  <ChevronRight size={17} className={styles.chev} />
                </span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div className={styles.empty}>No appointments match your filters.</div>
          )}
        </div>
      </div>

      <TabBar active="appts" />
    </main>
  );
}

