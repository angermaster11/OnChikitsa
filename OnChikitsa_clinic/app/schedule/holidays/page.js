'use client';

import { useState } from 'react';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Sheet from '../../_components/Sheet';
import Field from '../../_components/Field';
import Segmented from '../../_components/Segmented';
import Avatar from '../../_components/Avatar';
import EmptyState from '../../_components/EmptyState';
import { ChevronLeft, ChevronRight, Calendar, Trash, Plus } from '../../_components/icons';
import { DOCTORS, WEEKDAYS } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const uid = () => Math.random().toString(36).slice(2, 9);

function fmt(dstr) {
  const [y, m, d] = dstr.split('-').map(Number);
  return `${pad2(d)} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export default function Holidays() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(iso(now.getFullYear(), now.getMonth(), now.getDate()));
  const [holidays, setHolidays] = useState(() => {
    const y = now.getFullYear(), m = now.getMonth();
    return [
      { id: uid(), title: 'Clinic anniversary', date: iso(y, m, 12) },
      { id: uid(), title: 'Festival holiday', date: iso(y, m, 26) },
    ];
  });
  const [leaves, setLeaves] = useState(() => {
    const y = now.getFullYear(), m = now.getMonth();
    return [
      { id: uid(), doctor: 'Dr. Rahul Sharma', title: 'Personal leave', date: iso(y, m, 10) },
      { id: uid(), doctor: 'Dr. Neha Kapoor', title: 'Conference', date: iso(y, m, 18) },
    ];
  });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('clinic');
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState(DOCTORS[0].name);
  const [date, setDate] = useState(sel);

  const startDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const prevDays = new Date(view.y, view.m, 0).getDate();
  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  let nd = 1;
  while (cells.length % 7 !== 0) cells.push({ day: nd++, muted: true });

  const monthKey = `${view.y}-${pad2(view.m + 1)}`;
  const marked = new Set(
    [...holidays, ...leaves].filter((h) => h.date.startsWith(monthKey)).map((h) => Number(h.date.slice(8, 10)))
  );

  const shift = (delta) => { tapLight(); setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; }); };
  const openAdd = () => { tapLight(); setKind('clinic'); setTitle(''); setDoctor(DOCTORS[0].name); setDate(sel); setOpen(true); };
  const add = () => {
    tapLight();
    const t = title.trim() || (kind === 'clinic' ? 'Clinic holiday' : 'Leave');
    if (kind === 'clinic') setHolidays((xs) => [...xs, { id: uid(), title: t, date }]);
    else setLeaves((xs) => [...xs, { id: uid(), doctor, title: t, date }]);
    setOpen(false);
  };
  const removeHoliday = (id) => { tapLight(); setHolidays((xs) => xs.filter((x) => x.id !== id)); };
  const removeLeave = (id) => { tapLight(); setLeaves((xs) => xs.filter((x) => x.id !== id)); };

  return (
    <Screen>
      <TopBar title="Holidays & Leave" />
      <div className="content">
        <div className="cal">
          <div className="cal-head">
            <button className="icon-back" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{MONTHS[view.m]} {view.y}</div>
            <button className="icon-back" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={18} /></button>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <div className="cal-dow" key={w}>{w}</div>)}
            {cells.map((c, i) => {
              if (c.muted) return <span className="cal-day muted" key={i} aria-hidden="true">{c.day}</span>;
              const ds = iso(view.y, view.m, c.day);
              const isSel = ds === sel;
              const hasDot = marked.has(c.day);
              return (
                <button
                  key={i}
                  type="button"
                  className={`cal-day ${isSel ? 'sel' : ''} ${hasDot ? 'dot' : ''}`}
                  aria-pressed={isSel}
                  aria-label={`${fmt(ds)}${hasDot ? ', has holiday or leave' : ''}`}
                  onClick={() => { tapLight(); setSel(ds); }}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 22px 2px', fontSize: 12.5, color: 'var(--muted-fg)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', display: 'inline-block', flex: 'none' }} aria-hidden="true" />
          Marked dates have a clinic holiday or doctor leave
        </div>
        <div className="pad" style={{ marginTop: 8 }}>
          <button className="btn btn-primary btn-block" onClick={openAdd}><Plus size={18} /> Add holiday / leave</button>
        </div>
        <div className="section"><div className="section-head"><h2>Clinic holidays</h2></div></div>
        {holidays.length ? (
          <div className="list">
            {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
              <div className="list-row" key={h.id} style={{ cursor: 'default' }}>
                <div className="thumb-ic accent"><Calendar size={20} /></div>
                <div className="lr-main">
                  <div className="lr-title">{h.title}</div>
                  <div className="lr-sub" style={{ display: 'block' }}>{fmt(h.date)}</div>
                </div>
                <button className="icon-btn" aria-label={`Remove ${h.title}`} onClick={() => removeHoliday(h.id)}><Trash size={17} /></button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Calendar size={30} />} title="No clinic holidays" hint="Add a date the clinic will stay closed." />
        )}
        <div className="section"><div className="section-head"><h2>Doctor leave</h2></div></div>
        {leaves.length ? (
          <div className="list">
            {[...leaves].sort((a, b) => a.date.localeCompare(b.date)).map((l) => (
              <div className="list-row" key={l.id} style={{ cursor: 'default' }}>
                <Avatar name={l.doctor} size={46} />
                <div className="lr-main">
                  <div className="lr-title">{l.doctor}</div>
                  <div className="lr-sub" style={{ display: 'block' }}>{l.title} · {fmt(l.date)}</div>
                </div>
                <button className="icon-btn" aria-label={`Remove leave for ${l.doctor}`} onClick={() => removeLeave(l.id)}><Trash size={17} /></button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Calendar size={30} />} title="No leave scheduled" hint="Doctor leave days will appear here." />
        )}
        <div style={{ height: 16 }} />
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add holiday / leave">
        <div style={{ marginBottom: 16 }}>
          <Segmented
            options={[{ value: 'clinic', label: 'Clinic holiday' }, { value: 'leave', label: 'Doctor leave' }]}
            value={kind}
            onChange={setKind}
          />
        </div>
        {kind === 'leave' && (
          <Field label="Doctor" htmlFor="docSel">
            <select id="docSel" className="input" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              {DOCTORS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={kind === 'clinic' ? 'Holiday name' : 'Reason'} htmlFor="hTitle">
          <input id="hTitle" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'clinic' ? 'e.g. Republic Day' : 'e.g. Personal leave'} />
        </Field>
        <Field label="Date" htmlFor="hDate">
          <input id="hDate" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={add}>Add</button>
      </Sheet>
    </Screen>
  );
}
