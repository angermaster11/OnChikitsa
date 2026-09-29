'use client';

// Slot Configuration — the clinic's booking rules PLUS its weekly opening hours
// and holidays. Everything is clinic-wide and loads from / saves to the clinic
// profile (GET / PATCH /clinic/me):
//   slotConfiguration — slot length, break, capacity, booking window/toggles
//   weeklyHours       — per-day open windows ({start,end} 24h); empty day = off
//   holidays          — specific "YYYY-MM-DD" dates the clinic stays closed
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Stepper from '../../_components/Stepper';
import Toggle from '../../_components/Toggle';
import SubTabs from '../../_components/SubTabs';
import Sheet from '../../_components/Sheet';
import Field from '../../_components/Field';
import EmptyState from '../../_components/EmptyState';
import { Clock, Users, Calendar, Ban, CheckCircle, Plus, Edit, Trash, ArrowRight } from '../../_components/icons';
import { WEEKDAYS } from '../../_lib/data';
import { tapLight, notify } from '../../_lib/haptic';
import { clinicApi } from '../../_lib/api';

// 24-hour "HH:MM" options every 30 min; the value is stored, shown as 12-hour.
const TIMES = (() => {
  const out = [];
  for (let h = 6; h <= 22; h++) for (const m of ['00', '30']) out.push(`${String(h).padStart(2, '0')}:${m}`);
  return out;
})();
const label12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
};
const DAY_KEY = (label) => label.toLowerCase(); // 'Mon' -> 'mon'
const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const emptyWeek = () => ({ sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] });

// Friendly starting point for a clinic that hasn't set hours yet: Mon–Sat two
// windows (morning + evening), Sunday off. The clinic edits anything from here.
const DEFAULT_WEEK = () => {
  const w = emptyWeek();
  for (const k of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
    w[k] = [{ start: '09:00', end: '13:00' }, { start: '17:00', end: '20:00' }];
  }
  return w;
};

// Coerce whatever the API returns into the full 7-key shape with clean windows.
const normalizeWeek = (wh) => {
  const w = emptyWeek();
  if (wh && typeof wh === 'object') {
    for (const k of WEEK_KEYS) {
      if (Array.isArray(wh[k])) {
        w[k] = wh[k]
          .filter((r) => r && r.start && r.end)
          .map((r) => ({ start: r.start, end: r.end }))
          .sort((a, b) => a.start.localeCompare(b.start));
      }
    }
  }
  return w;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (ds) => { const [y, m, d] = ds.split('-').map(Number); return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`; };
const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };

// A labelled row wrapping a Stepper/Toggle control (used for the numeric rules).
function SettingRow({ icon, iconStyle, title, sub, control }) {
  return (
    <div className="set-row" style={{ cursor: 'default' }}>
      <span className="sr-ic" style={iconStyle}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>{sub}</div>
      </div>
      {control}
    </div>
  );
}

const DEFAULTS = { slotMin: 15, breakMin: 5, maxPer: 2, advance: 14, sameDay: true, bookingOn: true };
export default function SlotConfig() {
  const router = useRouter();

  // Numeric booking rules
  const [slotMin, setSlotMin] = useState(DEFAULTS.slotMin);
  const [breakMin, setBreakMin] = useState(DEFAULTS.breakMin);
  const [maxPer, setMaxPer] = useState(DEFAULTS.maxPer);
  const [advance, setAdvance] = useState(DEFAULTS.advance);
  const [sameDay, setSameDay] = useState(DEFAULTS.sameDay);
  const [bookingOn, setBookingOn] = useState(DEFAULTS.bookingOn);

  // Weekly opening hours (clinic-wide) + the day currently being edited
  const [hours, setHours] = useState(DEFAULT_WEEK);
  const [day, setDay] = useState(WEEKDAYS[0]); // 'Mon'
  const [edit, setEdit] = useState(null);      // { idx, start, end }; idx < 0 = new window

  // Holidays (specific closed dates)
  const [holidays, setHolidays] = useState([]);
  const [holOpen, setHolOpen] = useState(false);
  const [holDate, setHolDate] = useState(todayISO());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await clinicApi.getMe();
        if (!alive) return;
        const c = me?.slotConfiguration || {};
        setSlotMin(Number.isFinite(c.slotDurationMin) ? c.slotDurationMin : DEFAULTS.slotMin);
        setBreakMin(Number.isFinite(c.breakBetweenSlotsMin) ? c.breakBetweenSlotsMin : DEFAULTS.breakMin);
        setMaxPer(Number.isFinite(c.maxPatientsPerSlot) ? c.maxPatientsPerSlot : DEFAULTS.maxPer);
        setAdvance(Number.isFinite(c.advanceBookingDays) ? c.advanceBookingDays : DEFAULTS.advance);
        setSameDay(typeof c.sameDayBooking === 'boolean' ? c.sameDayBooking : DEFAULTS.sameDay);
        setBookingOn(typeof c.bookingEnabled === 'boolean' ? c.bookingEnabled : DEFAULTS.bookingOn);
        // Only override the friendly default week when the clinic has saved hours.
        if (me?.weeklyHours) setHours(normalizeWeek(me.weeklyHours));
        if (Array.isArray(me?.holidays)) setHolidays([...me.holidays].filter(Boolean).sort());
      } catch {
        if (alive) setErr('Couldn’t load your current configuration. Showing defaults.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);
  // ---- Working-hours editing (operates on the active day) ----
  const dk = DAY_KEY(day);
  const windows = hours[dk] || [];
  const setWindows = (fn) => setHours((h) => ({ ...h, [dk]: fn(h[dk] || []) }));

  const openNew = () => { tapLight(); setErr(''); setEdit({ idx: -1, start: '09:00', end: '13:00' }); };
  const openEdit = (i) => { tapLight(); setErr(''); setEdit({ idx: i, ...windows[i] }); };
  const saveWindow = () => {
    if (!edit || edit.start >= edit.end) return;
    setWindows((ws) => {
      const next = edit.idx < 0
        ? [...ws, { start: edit.start, end: edit.end }]
        : ws.map((w, i) => (i === edit.idx ? { start: edit.start, end: edit.end } : w));
      return next.sort((a, b) => a.start.localeCompare(b.start));
    });
    setEdit(null);
  };
  const delWindow = (i) => { tapLight(); setWindows((ws) => ws.filter((_, k) => k !== i)); };
  const markDayOff = () => { tapLight(); setWindows(() => []); };
  const copyToAll = () => {
    tapLight();
    setHours((h) => {
      const src = (h[dk] || []).map((w) => ({ ...w }));
      const next = { ...h };
      for (const k of WEEK_KEYS) if (k !== dk) next[k] = src.map((w) => ({ ...w }));
      return next;
    });
  };

  // ---- Holidays ----
  const addHoliday = () => {
    tapLight();
    if (!holDate) return;
    setHolidays((xs) => Array.from(new Set([...xs, holDate])).sort());
    setHolOpen(false);
  };
  const removeHoliday = (d) => { tapLight(); setHolidays((xs) => xs.filter((x) => x !== d)); };

  async function save() {
    if (saving) return;
    // Guard against any malformed window before hitting the API.
    for (const k of WEEK_KEYS) {
      for (const w of hours[k] || []) {
        if (!(w.start < w.end)) { setErr('Fix the working-hours window where close time isn’t after open time.'); return; }
      }
    }
    tapLight();
    setSaving(true);
    setErr('');
    try {
      await clinicApi.updateMe({
        slotConfiguration: {
          slotDurationMin: slotMin,
          breakBetweenSlotsMin: breakMin,
          maxPatientsPerSlot: maxPer,
          advanceBookingDays: advance,
          sameDayBooking: sameDay,
          bookingEnabled: bookingOn,
        },
        weeklyHours: hours,
        holidays: [...holidays].sort(),
      });
      notify('SUCCESS');
      router.back();
    } catch {
      setErr('Couldn’t save configuration. Check your connection and try again.');
      notify('ERROR');
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <Screen>
        <TopBar title="Slot Configuration" />
        <div className="content">
          <p style={{ padding: '28px 4px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>Loading…</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Slot Configuration" />
      <div className="content">
        <div className="section"><div className="section-head"><h2>Slot timing</h2></div></div>
        <div className="set-group">
          <SettingRow
            icon={<Clock size={18} />}
            title="Slot duration"
            sub="Length of each consultation slot"
            control={<Stepper value={slotMin} onChange={setSlotMin} min={5} max={60} step={5} suffix="min" />}
          />
          <SettingRow
            icon={<Clock size={18} />}
            title="Break between slots"
            sub="Buffer added after each slot"
            control={<Stepper value={breakMin} onChange={setBreakMin} min={0} max={30} step={5} suffix="min" />}
          />
          <SettingRow
            icon={<Users size={18} />}
            title="Max patients / slot"
            sub="Overbooking capacity per slot"
            control={<Stepper value={maxPer} onChange={setMaxPer} min={1} max={10} step={1} />}
          />
          <SettingRow
            icon={<Calendar size={18} />}
            title="Advance booking limit"
            sub="How far ahead patients can book"
            control={<Stepper value={advance} onChange={setAdvance} min={1} max={90} step={1} suffix="days" />}
          />
        </div>

        <div className="section"><div className="section-head"><h2>Booking</h2></div></div>
        <div className="set-group">
          <SettingRow
            icon={<Clock size={18} />}
            title="Same-day booking"
            sub="Allow patients to book for today"
            control={<Toggle on={sameDay} onChange={setSameDay} label="Same-day booking" />}
          />
          <SettingRow
            icon={bookingOn ? <CheckCircle size={18} /> : <Ban size={18} />}
            iconStyle={bookingOn
              ? { background: 'var(--accent-tint)', color: 'var(--accent-strong)' }
              : { background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)' }}
            title="Booking availability"
            sub={bookingOn ? 'Accepting new online bookings' : 'Online bookings paused'}
            control={<Toggle on={bookingOn} onChange={setBookingOn} label="Booking availability" />}
          />
        </div>
        <div className="section">
          <div className="section-head">
            <h2>Working hours</h2>
            <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Same for all doctors</span>
          </div>
        </div>
        <div style={{ marginTop: 2 }}>
          <SubTabs tabs={WEEKDAYS} active={day} onChange={setDay} />
        </div>

        <div className="section" style={{ marginTop: 4 }}>
          <div className="section-head">
            <h2>{day} · {windows.length ? `${windows.length} window${windows.length > 1 ? 's' : ''}` : 'closed'}</h2>
            <button className="link" onClick={openNew}>+ Add window</button>
          </div>
        </div>

        {windows.length ? (
          <>
            <div className="list">
              {windows.map((w, i) => (
                <div className="list-row" key={`${w.start}-${w.end}-${i}`} style={{ cursor: 'default' }}>
                  <div className="thumb-ic"><Clock size={20} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{label12(w.start)} <ArrowRight size={13} style={{ color: 'var(--faint-fg)' }} /> {label12(w.end)}</div>
                    <div className="lr-sub" style={{ display: 'block' }}>Open window {i + 1}</div>
                  </div>
                  <div className="lr-end" style={{ flexDirection: 'row' }}>
                    <button className="icon-btn" aria-label={`Edit window ${i + 1}`} onClick={() => openEdit(i)}><Edit size={17} /></button>
                    <button className="icon-btn" aria-label={`Delete window ${i + 1}`} onClick={() => delWindow(i)}><Trash size={17} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '8px 22px 4px' }}>
              <button className="btn btn-soft" style={{ flex: 1 }} onClick={copyToAll}>Copy to all days</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={markDayOff}>Set day off</button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Ban size={30} />}
            title={`${day} is a day off`}
            hint="Patients can’t book when a day has no open hours. Add a window to open this day."
            action={<button className="btn btn-soft" onClick={openNew} style={{ minHeight: 44 }}><Plus size={16} /> Add hours</button>}
          />
        )}
        <div className="section" style={{ marginTop: 8 }}>
          <div className="section-head">
            <h2>Holidays</h2>
            <button className="link" onClick={() => { tapLight(); setHolDate(todayISO()); setHolOpen(true); }}>+ Add date</button>
          </div>
        </div>
        {holidays.length ? (
          <div className="list">
            {[...holidays].sort().map((d) => (
              <div className="list-row" key={d} style={{ cursor: 'default' }}>
                <div className="thumb-ic accent"><Calendar size={20} /></div>
                <div className="lr-main">
                  <div className="lr-title">{fmtDate(d)}</div>
                  <div className="lr-sub" style={{ display: 'block' }}>Clinic closed — bookings blocked</div>
                </div>
                <button className="icon-btn" aria-label={`Remove holiday ${fmtDate(d)}`} onClick={() => removeHoliday(d)}><Trash size={17} /></button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar size={30} />}
            title="No holidays set"
            hint="Add specific dates the clinic stays closed (festival days, maintenance, etc.)."
          />
        )}

        {err ? (
          <p role="alert" style={{ margin: '10px 22px 0', fontSize: 13.5, fontWeight: 600, color: 'var(--danger)', lineHeight: 1.5 }}>{err}</p>
        ) : null}

        <div className="pad" style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Add / edit a working-hours window for the active day */}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && edit.idx < 0 ? `Add hours · ${day}` : `Edit hours · ${day}`}>
        {edit ? (
          <>
            <div className="field-row">
              <Field label="Open from" htmlFor="wStart">
                <select id="wStart" className="input" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })}>
                  {TIMES.map((t) => <option key={t} value={t}>{label12(t)}</option>)}
                </select>
              </Field>
              <Field label="Close at" htmlFor="wEnd">
                <select id="wEnd" className="input" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })}>
                  {TIMES.map((t) => <option key={t} value={t}>{label12(t)}</option>)}
                </select>
              </Field>
            </div>
            <p className={`field-msg ${edit.start >= edit.end ? 'bad' : 'hint'}`}>
              {edit.start >= edit.end ? 'Close time must be after open time.' : 'Patients can book any slot inside this window.'}
            </p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={saveWindow} disabled={edit.start >= edit.end}>
              Save window
            </button>
          </>
        ) : null}
      </Sheet>

      {/* Add a holiday date */}
      <Sheet open={holOpen} onClose={() => setHolOpen(false)} title="Add holiday">
        <Field label="Date" htmlFor="holDate" hint="The clinic will be closed and bookings blocked on this date.">
          <input id="holDate" type="date" className="input" value={holDate} min={todayISO()} onChange={(e) => setHolDate(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={addHoliday} disabled={!holDate}>Add date</button>
      </Sheet>
    </Screen>
  );
}






