'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, RefreshCw, Play,
  Check, X, SkipForward, Clock, AlertCircle,
} from '../_components/icons';
import BottomNav from '../_components/BottomNav';
import { tapLight } from '../_lib/haptic';
import { appointmentApi, ApiError } from '../_lib/api';
import styles from './queue.module.css';

// Backend status → the UI bucket the existing pill/number styles speak.
const UI_BUCKET = {
  BOOKED: 'waiting', ARRIVED: 'waiting', CONSULTING: 'waiting',
  COMPLETED: 'completed', NO_SHOW: 'absent',
};
const PILL_LABEL = { waiting: 'Waiting', completed: 'Completed', absent: 'Absent' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function initials(name) {
  const p = String(name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function to12(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  const ampm = (h || 0) >= 12 ? 'PM' : 'AM';
  const h12 = ((h || 0) % 12) || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}
function localToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return { iso, label: `Today, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
}
const codeFor = (a) => a.appointmentCode || `OC-${String(a._id).slice(-6).toUpperCase()}`;

export default function QueuePage() {
  const today = useMemo(() => localToday(), []);
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await appointmentApi.list({ date: today.iso, limit: 100 });
      setRaw(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }, [today.iso]);

  useEffect(() => { load(); }, [load]);

  // Real appointments only — holds and cancellations aren't part of the queue.
  const items = useMemo(() => raw
    .filter((a) => a.status !== 'CANCELLED' && a.status !== 'PENDING_PAYMENT')
    .map((a) => ({
      id: String(a._id),
      code: codeFor(a),
      name: a.patient?.name || 'Patient',
      age: a.patient?.age,
      gender: a.patient?.gender || '',
      type: a.reason || 'Consultation',
      time: to12(a.slotStart),
      token: a.tokenNo,
      status: a.status,
      // Persisted skip stamp (ms, 0 = not skipped) → drives queue-tail ordering.
      skippedAt: a.skippedAt ? new Date(a.skippedAt).getTime() : 0,
      bucket: UI_BUCKET[a.status] || 'waiting',
    })), [raw]);

  // Waiting patients in queue order: real per-day token, with any skipped ones
  // bumped to the tail (latest skip sits furthest back). Persisted server-side.
  const waiting = useMemo(() => items
    .filter((p) => p.status === 'BOOKED' || p.status === 'ARRIVED')
    .sort((a, b) => (a.skippedAt - b.skippedAt) || a.token - b.token),
  [items]);

  // The patient on screen: whoever is mid-consultation, else the head of the queue.
  const consulting = useMemo(() => items.find((p) => p.status === 'CONSULTING') || null, [items]);
  const current = consulting || waiting[0] || null;

  const counts = useMemo(() => ({
    all: items.length,
    waiting: items.filter((p) => p.status === 'BOOKED' || p.status === 'ARRIVED').length,
    completed: items.filter((p) => p.status === 'COMPLETED').length,
    absent: items.filter((p) => p.status === 'NO_SHOW').length,
  }), [items]);

  // Rows = everyone except the current patient, waiting first (in queue order),
  // then completed, then absent — narrowed to the active tab.
  const rows = useMemo(() => {
    const order = { waiting: 0, completed: 1, absent: 2 };
    return items
      .filter((p) => p.id !== current?.id)
      .filter((p) => filter === 'all' || p.bucket === filter)
      .sort((a, b) => order[a.bucket] - order[b.bucket] || (a.skippedAt - b.skippedAt) || (a.token || 0) - (b.token || 0));
  }, [items, filter, current]);

  // Run a queue mutation then refetch, with a single-flight guard against double taps.
  const run = async (fn, failMsg) => {
    if (acting) return;
    setActing(true); tapLight();
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failMsg);
    } finally {
      setActing(false);
    }
  };
  const start = (id) => run(() => appointmentApi.updateStatus(id, 'CONSULTING'), 'Could not update the patient.');
  const complete = (id) => run(() => appointmentApi.updateStatus(id, 'COMPLETED'), 'Could not update the patient.');
  const absent = (id) => run(() => appointmentApi.updateStatus(id, 'NO_SHOW'), 'Could not update the patient.');
  const skip = (id) => run(() => appointmentApi.skip(id, true), 'Could not skip the patient.');

  const isConsulting = current?.status === 'CONSULTING';
  const STAT = [
    { key: 'all', lbl: 'Total', cls: 'green' },
    { key: 'waiting', lbl: 'Waiting', cls: 'blue' },
    { key: 'completed', lbl: 'Completed', cls: 'amber' },
    { key: 'absent', lbl: 'Absent', cls: 'red' },
  ];
  const TABS = [
    { key: 'all', label: 'All' }, { key: 'waiting', label: 'Waiting' },
    { key: 'completed', label: 'Completed' }, { key: 'absent', label: 'Absent' },
  ];

  return (
    <main className={styles.root}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Queue</h1>
            <p className={styles.sub}>Manage your patient queue</p>
          </div>
          <span className={styles.datePill}><Calendar size={15} />{today.label}</span>
        </header>

        <div className={styles.stats}>
          {STAT.map((s) => (
            <button
              key={s.key}
              className={`${styles.stat} ${styles['s_' + s.cls]} ${filter === s.key ? styles.statOn : ''}`}
              onClick={() => { tapLight(); setFilter(s.key); }}
            >
              <span className={styles.statN}>{counts[s.key]}</span>
              <span className={styles.statL}>{s.lbl}</span>
            </button>
          ))}
        </div>

        {error && <div className={styles.errBox}><AlertCircle size={16} />{error}</div>}

        {current && (
          <section className={styles.current}>
            <div className={styles.curTop}>
              <span className={styles.curTag}><i className={styles.liveDot} />{isConsulting ? 'In Consultation' : 'Up Next'}</span>
              <span className={styles.curBadge}>Token #{current.token}</span>
            </div>
            <div className={styles.curBody}>
              <span className={styles.curAv}>{initials(current.name)}</span>
              <div className={styles.curInfo}>
                <span className={styles.curName}>{current.name}</span>
                <span className={styles.curMeta}>{[current.age ? `${current.age} yrs` : null, current.gender].filter(Boolean).join(' • ')}</span>
                <span className={styles.curType}>{current.type}</span>
                <span className={styles.curCode}>{current.code}</span>
              </div>
              <div className={styles.curTime}>
                <span className={styles.curClock}><Clock size={13} />{current.time}</span>
                <span className={styles.curTimeLbl}>Scheduled Time</span>
              </div>
            </div>
            <div className={styles.curActions}>
              <button className={`${styles.act} ${styles.actSkip}`} disabled={acting || isConsulting} onClick={() => skip(current.id)}>
                <SkipForward size={16} />Skip
              </button>
              {isConsulting ? (
                <button className={`${styles.act} ${styles.actDone}`} disabled={acting} onClick={() => complete(current.id)}>
                  <Check size={16} />Continue
                </button>
              ) : (
                <button className={`${styles.act} ${styles.actDone}`} disabled={acting} onClick={() => start(current.id)}>
                  <Play size={16} />Start
                </button>
              )}
              <button className={`${styles.act} ${styles.actAbsent}`} disabled={acting} onClick={() => absent(current.id)}>
                <X size={16} />Absent
              </button>
            </div>
          </section>
        )}

        <div className={styles.listHead}>
          <h2 className={styles.listTitle}>Queue List <span>({rows.length})</span></h2>
          <div className={styles.listActs}>
            <button className={styles.iconGhost} aria-label="Refresh queue" disabled={loading || acting} onClick={() => { tapLight(); load(); }}>
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.qtab} ${filter === t.key ? styles.qtabOn : ''}`}
              onClick={() => { tapLight(); setFilter(t.key); }}
            >
              {t.label} <span className={styles.qtabN}>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>Loading queue…</div>
          ) : (
            <>
              {rows.map((p) => (
                <div key={p.id} className={styles.row}>
                  <span className={`${styles.num} ${styles['num_' + p.bucket]}`}>
                    {p.bucket === 'waiting' ? p.token : p.bucket === 'completed' ? <Check size={15} /> : <X size={15} />}
                  </span>
                  <span className={styles.rAv}>{initials(p.name)}</span>
                  <span className={styles.rMid}>
                    <span className={styles.rName}>{p.name}</span>
                    <span className={styles.rMeta}>{[p.age ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' • ')}</span>
                    <span className={styles.rType}>{p.type} · {p.code}</span>
                  </span>
                  <span className={styles.rEnd}>
                    <span className={styles.rTime}>{p.time}</span>
                    <span className={`${styles.rPill} ${styles['rp_' + p.bucket]}`}>{PILL_LABEL[p.bucket]}</span>
                  </span>
                </div>
              ))}
              {rows.length === 0 && <div className={styles.empty}>No patients in this list.</div>}
            </>
          )}
        </div>
      </div>

      <BottomNav active="queue" />
    </main>
  );
}



