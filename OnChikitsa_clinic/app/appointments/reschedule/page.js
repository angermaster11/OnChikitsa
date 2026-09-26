'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import { Clock, ChevronLeft, ChevronRight, Check, Stethoscope } from '../../_components/icons';
import { findAppt } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '11:30 AM', '12:00 PM', '04:00 PM', '04:30 PM', '05:30 PM'];
const BOOKED = new Set(['10:00 AM', '04:00 PM']);
const DOTS = new Set([3, 8, 15, 21, 24, 29]); // days with open slots
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Reschedule() {
  const router = useRouter();
  const [id, setId] = useState(null);
  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);
  const a = findAppt(id);

  const [cur, setCur] = useState({ y: 2026, m: 9 }); // October 2026
  const [selDay, setSelDay] = useState(24);
  const [slot, setSlot] = useState('');

  const firstDow = new Date(cur.y, cur.m, 1).getDay();
  const dim = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  function shift(delta) {
    tapLight();
    setCur((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const canConfirm = selDay && slot;
  function confirm() {
    if (!canConfirm) return;
    tapLight();
    router.back();
  }

  return (
    <Screen>
      <TopBar title="Reschedule" subtitle={a.id} />
      <div className="content">
        <div className="section"><div className="section-head"><h2>Current appointment</h2></div></div>
        <div style={{ padding: '0 22px' }}>
          <div className="appt-card">
            <div className="ac-top">
              <Avatar name={a.patient} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ac-name">{a.patient}</div>
                <div className="ac-sub">{a.doctor} · {a.service}</div>
              </div>
              <div className="token-chip"><span className="k">TOKEN</span><span className="v">{a.token}</span></div>
            </div>
            <div className="ac-meta">
              <span className="chip chip-plain"><Clock size={13} /> {a.date} · {a.time}</span>
              <StatusPill status={a.status} />
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stethoscope size={14} /> {a.doctor}
          </p>
        </div>

        <div className="section"><div className="section-head"><h2>Pick a new date</h2></div></div>
        <div className="cal">
          <div className="cal-head">
            <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={20} /></button>
            <strong style={{ fontSize: 15 }}>{MONTHS[cur.m]} {cur.y}</strong>
            <button className="icon-btn" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={20} /></button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d, i) => d === null
              ? <div key={`b${i}`} className="cal-day muted" aria-hidden="true" />
              : (
                <button
                  key={d}
                  className={`cal-day ${selDay === d ? 'sel' : ''} ${DOTS.has(d) ? 'dot' : ''}`}
                  aria-label={`${d} ${MONTHS[cur.m]} ${cur.y}`}
                  aria-pressed={selDay === d}
                  onClick={() => { tapLight(); setSelDay(d); }}
                >
                  {d}
                </button>
              ))}
          </div>
        </div>

        <div className="section"><div className="section-head"><h2>Available slots</h2></div></div>
        <div className="slots">
          {SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              className={`slot-btn ${slot === t ? 'sel' : ''}`}
              aria-pressed={slot === t}
              disabled={BOOKED.has(t)}
              onClick={() => { tapLight(); setSlot(t); }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pad" style={{ padding: '18px 22px 8px' }}>
          <button className="btn btn-primary btn-block" disabled={!canConfirm} onClick={confirm}>
            <Check size={20} /> Confirm reschedule
          </button>
        </div>
        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
