'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import SubTabs from '../_components/SubTabs';
import Sheet from '../_components/Sheet';
import Field from '../_components/Field';
import Toggle from '../_components/Toggle';
import Avatar from '../_components/Avatar';
import EmptyState from '../_components/EmptyState';
import { Clock, Plus, Copy, Edit, Trash, ArrowRight, ChevronRight, Calendar } from '../_components/icons';
import { DOCTORS, WEEKDAYS } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

const TIMES = (() => {
  const out = [];
  for (let h = 8; h <= 21; h++) {
    for (const m of ['00', '30']) {
      const ap = h < 12 ? 'AM' : 'PM';
      const hh = h % 12 === 0 ? 12 : h % 12;
      out.push(`${String(hh).padStart(2, '0')}:${m} ${ap}`);
    }
  }
  return out;
})();

const uid = () => Math.random().toString(36).slice(2, 9);

function seedSchedule() {
  const map = {};
  for (const d of DOCTORS) {
    map[d.id] = {};
    for (const wd of WEEKDAYS) {
      map[d.id][wd] = wd === 'Sun' ? [] : [
        { id: uid(), from: '09:00 AM', to: '01:00 PM' },
        { id: uid(), from: '05:00 PM', to: '08:00 PM' },
      ];
    }
  }
  return map;
}

export default function DoctorSchedule() {
  const router = useRouter();
  const go = (r) => { tapLight(); router.push(r); };

  const [docId, setDocId] = useState(DOCTORS[0].id);
  const [day, setDay] = useState(WEEKDAYS[0]);
  const [sched, setSched] = useState(seedSchedule);
  const [edit, setEdit] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState([]);

  const doctor = DOCTORS.find((d) => d.id === docId) || DOCTORS[0];
  const ranges = sched[docId]?.[day] || [];

  function updateRanges(fn) {
    setSched((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], [day]: fn(prev[docId]?.[day] || []) },
    }));
  }
  const addRange = () => { tapLight(); updateRanges((rs) => [...rs, { id: uid(), from: '09:00 AM', to: '10:00 AM' }]); };
  const delRange = (id) => { tapLight(); updateRanges((rs) => rs.filter((r) => r.id !== id)); };
  const saveEdit = () => {
    updateRanges((rs) => rs.map((r) => (r.id === edit.id ? { ...r, from: edit.from, to: edit.to } : r)));
    setEdit(null);
  };
  const toggleTarget = (w) => setCopyTargets((t) => (t.includes(w) ? t.filter((x) => x !== w) : [...t, w]));
  const applyCopy = () => {
    tapLight();
    setSched((prev) => {
      const src = prev[docId][day];
      const next = { ...prev[docId] };
      for (const w of copyTargets) next[w] = src.map((r) => ({ ...r, id: uid() }));
      return { ...prev, [docId]: next };
    });
    setCopyOpen(false);
    setCopyTargets([]);
  };

  return (
    <Screen>
      <TopBar title="Doctor Schedule" />
      <div className="content">
        <div className="section"><div className="section-head"><h2>Doctor</h2></div></div>
        <div style={{ display: 'flex', gap: 8, padding: '0 22px 6px', overflowX: 'auto' }}>
          {DOCTORS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={docId === d.id}
              onClick={() => { tapLight(); setDocId(d.id); }}
              className={`chip ${docId === d.id ? 'chip-accent' : 'chip-plain'}`}
              style={{ flex: 'none', minHeight: 44 }}
            >
              {d.name.replace('Dr. ', 'Dr ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 22px 8px' }}>
          <Avatar name={doctor.name} size={40} status={doctor.active ? 'on' : 'off'} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{doctor.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>{doctor.spec} · Fee ₹{doctor.fee}</div>
          </div>
        </div>
        <SubTabs tabs={WEEKDAYS} active={day} onChange={setDay} />
        <div className="section">
          <div className="section-head">
            <h2>{day} · working hours</h2>
            <button className="link" onClick={addRange}>+ Add range</button>
          </div>
        </div>
        {ranges.length ? (
          <>
            <div className="list">
              {ranges.map((r, i) => (
                <div className="list-row" key={r.id} style={{ cursor: 'default' }}>
                  <div className="thumb-ic"><Clock size={20} /></div>
                  <div className="lr-main">
                    <div className="lr-title">Slot {i + 1}</div>
                    <div className="lr-sub" style={{ gap: 8 }}>
                      <span className="chip chip-plain"><Clock size={12} /> {r.from}</span>
                      <ArrowRight size={13} style={{ color: 'var(--faint-fg)' }} />
                      <span className="chip chip-plain">{r.to}</span>
                    </div>
                  </div>
                  <div className="lr-end" style={{ flexDirection: 'row' }}>
                    <button className="icon-btn" aria-label={`Edit slot ${i + 1}`} onClick={() => { tapLight(); setEdit({ ...r }); }}><Edit size={17} /></button>
                    <button className="icon-btn" aria-label={`Delete slot ${i + 1}`} onClick={() => delRange(r.id)}><Trash size={17} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '8px 22px 4px' }}>
              <button className="btn btn-soft" style={{ flex: 1 }} onClick={addRange}><Plus size={17} /> Add range</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { tapLight(); setCopyOpen(true); }}><Copy size={17} /> Copy day</button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Calendar size={30} />}
            title="Day off"
            hint={`No working hours set for ${day}. Add a time range or copy another day.`}
            action={<button className="btn btn-soft" onClick={addRange} style={{ minHeight: 44 }}><Plus size={16} /> Add time range</button>}
          />
        )}
        <div className="section"><div className="section-head"><h2>Configuration</h2></div></div>
        <div className="list">
          <button className="list-row" onClick={() => go('/schedule/slots')}>
            <div className="thumb-ic"><Clock size={20} /></div>
            <div className="lr-main">
              <div className="lr-title">Slot configuration</div>
              <div className="lr-sub" style={{ display: 'block' }}>Slot duration, breaks, capacity, booking window</div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
          </button>
          <button className="list-row" onClick={() => go('/schedule/holidays')}>
            <div className="thumb-ic accent"><Calendar size={20} /></div>
            <div className="lr-main">
              <div className="lr-title">Holidays / Leave</div>
              <div className="lr-sub" style={{ display: 'block' }}>Clinic holidays and doctor leave</div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Edit working hours">
        {edit && (
          <>
            <div className="field-row">
              <Field label="From" htmlFor="fromT">
                <select id="fromT" className="input" value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value })}>
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="To" htmlFor="toT">
                <select id="toT" className="input" value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })}>
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <button className="btn btn-primary btn-block" onClick={saveEdit}>Save</button>
          </>
        )}
      </Sheet>

      <Sheet open={copyOpen} onClose={() => setCopyOpen(false)} title={`Copy ${day} to other days`}>
        <div className="list" style={{ padding: 0, gap: 8, marginBottom: 14 }}>
          {WEEKDAYS.filter((w) => w !== day).map((w) => (
            <div className="list-row" key={w} style={{ cursor: 'default' }}>
              <div className="lr-main"><div className="lr-title">{w}</div></div>
              <Toggle on={copyTargets.includes(w)} onChange={() => toggleTarget(w)} label={`Copy to ${w}`} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={applyCopy} disabled={!copyTargets.length}>
          Copy to {copyTargets.length || 'selected'} {copyTargets.length === 1 ? 'day' : 'days'}
        </button>
      </Sheet>
    </Screen>
  );
}
