'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import Toggle from '../../_components/Toggle';
import { Building, Video, Home, Phone, Mail, ArrowRight } from '../../_components/icons';
import { CLINIC, SERVICES } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const STEP = 3;

const CONSULT = [
  { key: 'clinic', label: 'In-clinic', sub: 'Patients visit your clinic', Icon: Building },
  { key: 'video', label: 'Video consultation', sub: 'Online appointments', Icon: Video },
  { key: 'home', label: 'Home visit', sub: 'Doctor visits the patient', Icon: Home },
];

export default function ClinicDetails() {
  const router = useRouter();
  const [about, setAbout] = useState(CLINIC.about);
  const [services, setServices] = useState(() => SERVICES.slice(0, 2).map((s) => s.name));
  const [consult, setConsult] = useState({ clinic: true, video: true, home: false });
  const [phone, setPhone] = useState(CLINIC.phone);
  const [email, setEmail] = useState(CLINIC.email);

  const canContinue = about.trim() && services.length > 0 && Object.values(consult).some(Boolean);

  function toggleService(name) {
    tapLight();
    setServices((cur) => cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name]);
  }
  function cont() {
    if (!canContinue) return;
    tapLight();
    router.push('/setup/photos');
  }

  const textarea = {
    width: '100%', background: 'var(--field)', border: '1.5px solid transparent',
    borderRadius: 14, padding: '13px 15px', minHeight: 110, resize: 'vertical',
    fontSize: 15.5, lineHeight: 1.5, color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <Screen>
      <TopBar title="Clinic profile" subtitle="Step 3 of 6" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="wiz">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`wseg ${n < STEP ? 'done' : ''} ${n === STEP ? 'now' : ''}`} />
          ))}
        </div>
        <div className="wiz-step">Describe what your clinic offers</div>

        <div className="pad" style={{ paddingTop: 14, flex: 1 }}>
          <Field label="About the clinic" htmlFor="about" required bare
            hint="A short intro patients will see on your profile">
            <textarea id="about" style={textarea} value={about} rows={4}
              placeholder="Tell patients about your clinic, specialities and facilities…"
              onChange={(e) => setAbout(e.target.value)} />
          </Field>

          <Field label="Services offered" required bare
            hint={`${services.length} selected · tap to toggle`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {SERVICES.map((s) => {
                const on = services.includes(s.name);
                return (
                  <button key={s.id} type="button" aria-pressed={on}
                    className={`chip ${on ? 'chip-accent' : 'chip-plain'}`}
                    style={{ minHeight: 44 }}
                    onClick={() => toggleService(s.name)}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Consultation types" required bare>
            <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
              {CONSULT.map(({ key, label, sub, Icon }, i) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
                  borderTop: i ? '1px solid var(--border)' : 'none',
                }}>
                  <span className="thumb-ic" style={{ width: 40, height: 40 }}><Icon size={19} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 1 }}>{sub}</div>
                  </div>
                  <Toggle on={consult[key]} label={label}
                    onChange={(v) => setConsult((c) => ({ ...c, [key]: v }))} />
                </div>
              ))}
            </div>
          </Field>

          <Field label="Contact number" htmlFor="cphone" required lead={<Phone size={18} />}>
            <input id="cphone" className="input" type="tel" inputMode="tel" value={phone}
              placeholder="+91 98765 43210" onChange={(e) => setPhone(e.target.value)} />
          </Field>

          <Field label="Contact email" htmlFor="cemail" optional lead={<Mail size={18} />}>
            <input id="cemail" className="input" type="email" inputMode="email" value={email}
              placeholder="care@clinic.in" onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        <div className="pad" style={{ paddingTop: 4, paddingBottom: 'calc(20px + var(--sab))' }}>
          <button className="btn btn-primary btn-block" onClick={cont} disabled={!canContinue}>
            Continue <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </Screen>
  );
}
