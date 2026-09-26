'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import Segmented from '../../_components/Segmented';
import { Search, Check, CreditCard } from '../../_components/icons';
import { DOCTORS, SERVICES, rupee } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM',
];
const BOOKED = new Set(['10:00 AM', '11:30 AM', '05:00 PM']);

function ChipRow({ options, value, onPick, ariaPrefix }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-label={`${ariaPrefix} ${o.label}`}
            aria-pressed={on}
            className={`chip ${on ? 'chip-accent' : 'chip-plain'}`}
            style={{ minHeight: 44 }}
            onClick={() => { tapLight(); onPick(o.key); }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CreateAppointment() {
  const router = useRouter();
  const [patient, setPatient] = useState('');
  const [doctor, setDoctor] = useState(DOCTORS[0].id);
  const [service, setService] = useState(SERVICES[0].id);
  const [date, setDate] = useState('2026-09-24');
  const [slot, setSlot] = useState('');
  const [pay, setPay] = useState('online');

  const svc = SERVICES.find((s) => s.id === service);
  const canBook = patient.trim() && slot;

  function book() {
    if (!canBook) return;
    tapLight();
    router.push('/appointments');
  }

  return (
    <Screen>
      <TopBar title="New appointment" subtitle="Walk-in / phone booking" />
      <div className="content">
        <div className="pad" style={{ paddingTop: 8 }}>
          <Field label="Patient" htmlFor="patient" required hint="Search an existing patient or type a new name" lead={<Search size={18} />}>
            <input
              id="patient"
              className="input"
              type="text"
              placeholder="Name or phone number"
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
            />
          </Field>
        </div>

        <div className="section"><div className="section-head"><h2>Doctor</h2></div></div>
        <div className="pad">
          <ChipRow
            ariaPrefix="Select doctor"
            options={DOCTORS.map((d) => ({ key: d.id, label: d.name }))}
            value={doctor}
            onPick={setDoctor}
          />
        </div>

        <div className="section"><div className="section-head"><h2>Service</h2></div></div>
        <div className="pad">
          <ChipRow
            ariaPrefix="Select service"
            options={SERVICES.map((s) => ({ key: s.id, label: s.name }))}
            value={service}
            onPick={setService}
          />
          {svc ? (
            <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted-fg)' }}>
              {svc.mins} min · {rupee(svc.fee)}
            </p>
          ) : null}
        </div>

        <div className="pad" style={{ paddingTop: 14 }}>
          <Field label="Date" htmlFor="date">
            <input id="date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="section"><div className="section-head"><h2>Available slots</h2></div></div>
        <div className="slots">
          {SLOTS.map((t) => {
            const booked = BOOKED.has(t);
            return (
              <button
                key={t}
                type="button"
                className={`slot-btn ${slot === t ? 'sel' : ''}`}
                aria-pressed={slot === t}
                disabled={booked}
                onClick={() => { tapLight(); setSlot(t); }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="section"><div className="section-head"><h2>Payment mode</h2></div></div>
        <div className="pad">
          <Segmented
            options={[{ value: 'online', label: 'Online' }, { value: 'clinic', label: 'Pay at clinic' }]}
            value={pay}
            onChange={setPay}
          />
          <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={14} />
            {pay === 'online' ? 'Payment link sent to the patient.' : 'Collect payment at the front desk.'}
          </p>
        </div>

        <div className="pad" style={{ padding: '18px 22px 8px' }}>
          <button className="btn btn-primary btn-block" disabled={!canBook} onClick={book}>
            <Check size={20} /> Confirm booking
          </button>
        </div>

        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
