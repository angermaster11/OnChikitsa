'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Phone, Ticket, RefreshCw, Clock } from '../_components/icons';
import BottomNav from '../_components/BottomNav';
import { tapLight } from '../_lib/haptic';
import { flow } from '../_lib/flow';
import { appointmentApi } from '../_lib/api';
import styles from './appointments.module.css';

// Backend statuses (UPPERCASE) → UI label, filter group, and colour key. The
// colour keys map to the tb_/av_/pill_ classes in the CSS module.
const STATUS = {
  BOOKED:     { label: 'Booked',     grp: 'upcoming',  color: 'grey'  },
  ARRIVED:    { label: 'Arrived',    grp: 'inqueue',   color: 'blue'  },
  CONSULTING: { label: 'Consulting', grp: 'inqueue',   color: 'amber' },
  COMPLETED:  { label: 'Completed',  grp: 'completed', color: 'green' },
  CANCELLED:  { label: 'Cancelled',  grp: 'cancelled', color: 'red'   },
  NO_SHOW:    { label: 'No-show',    grp: 'cancelled', color: 'red'   },
};

const CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'inqueue', label: 'In Queue' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

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
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

export default function Appointments() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };

  const [date, setDate] = useState(() => ymd(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  // Auth gate — mirror the dashboard: an unauthenticated visitor is bounced to
  // login before any clinic data is requested.
  useEffect(() => { if (!flow.isAuthed()) router.replace('/login'); }, [router]);

  // A rolling two-week strip starting today; each entry carries the ISO day we
  // actually query the backend with.
  const days = useMemo(() => {
    const base = new Date(); base.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(base); dt.setDate(base.getDate() + i);
      return {
        iso: ymd(dt),
        dow: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        d: dt.getDate(),
        mo: dt.toLocaleDateString('en-US', { month: 'short' }),
      };
    });
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await appointmentApi.list({ date });
      setItems(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setError(e?.message || 'Could not load appointments.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: items.length, upcoming: 0, inqueue: 0, completed: 0, cancelled: 0 };
    items.forEach((a) => { const g = STATUS[a.status]?.grp; if (g) c[g] += 1; });
    return c;
  }, [items]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((a) => {
      if (filter !== 'all' && STATUS[a.status]?.grp !== filter) return false;
      if (!term) return true;
      const name = (a.patient?.name || '').toLowerCase();
      const phone = a.patient?.phone || '';
      return name.includes(term) || phone.includes(term);
    });
  }, [items, filter, q]);
  return (
    <main className={styles.root}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div className={styles.headTxt}>
            <h1 className={styles.title}>Appointments</h1>
            <p className={styles.sub}>Manage your clinic appointments</p>
          </div>
          <button className={styles.create} onClick={() => { tapLight(); load(); }} aria-label="Refresh appointments">
            <RefreshCw size={18} />Refresh
          </button>
        </header>

        <div className={styles.searchRow}>
          <div className={styles.search}>
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search patients..." aria-label="Search patients" />
          </div>
        </div>

        <div className={styles.dateStrip}>
          {days.map((dd) => (
            <button key={dd.iso} className={`${styles.dayCard} ${date === dd.iso ? styles.dayOn : ''}`}
              onClick={() => { tapLight(); setDate(dd.iso); }}>
              <span className={styles.dayDow}>{dd.dow}</span>
              <span className={styles.dayNum}>{dd.d}</span>
              <span className={styles.dayMo}>{dd.mo}</span>
            </button>
          ))}
        </div>

        <div className={styles.chips}>
          {CHIPS.map((c) => (
            <button key={c.key} className={`${styles.chip} ${filter === c.key ? styles.chipOn : ''}`}
              onClick={() => { tapLight(); setFilter(c.key); }}>
              {c.label} <span className={styles.chipN}>{counts[c.key]}</span>
            </button>
          ))}
        </div>
        <div className={styles.list}>
          {loading && <div className={styles.empty}>Loading appointments…</div>}
          {!loading && error && <div className={styles.empty}>{error}</div>}
          {!loading && !error && list.map((a) => {
            const m = STATUS[a.status] || { label: a.status, color: 'grey' };
            const p = a.patient || {};
            const slot = [to12(a.slotStart), to12(a.slotEnd)].filter(Boolean).join(' – ');
            const meta = [p.age ? `${p.age} yrs` : '', titleCase(p.gender)].filter(Boolean).join(' • ');
            return (
              <button key={a._id} className={styles.card} onClick={go(`/appointments/detail?id=${a._id}`)}>
                <span className={`${styles.rail} ${styles['rail_' + m.color]}`} />
                <span className={styles.cardMain}>
                  <span className={styles.cardTop}>
                    <span className={`${styles.av} ${styles['av_' + m.color]}`}>{initials(p.name)}</span>
                    <span className={styles.who}>
                      <span className={styles.name}>{p.name || 'Patient'}</span>
                      {meta && <span className={styles.meta}>{meta}</span>}
                    </span>
                    <span className={`${styles.pill} ${styles['pill_' + m.color]}`}><i />{m.label}</span>
                  </span>
                  <span className={styles.cardMeta}>
                    {slot && <span className={styles.mItem}><Clock size={13} />{slot}</span>}
                    <span className={`${styles.mItem} ${styles.mTok}`}><Ticket size={13} />#{a.tokenNo}</span>
                    {p.phone && <span className={styles.mItem}><Phone size={12} />{p.phone}</span>}
                  </span>
                </span>
              </button>
            );
          })}
          {!loading && !error && list.length === 0 && (
            <div className={styles.empty}>No appointments for this day.</div>
          )}
        </div>
      </div>

      <BottomNav active="appointments" />
    </main>
  );
}
