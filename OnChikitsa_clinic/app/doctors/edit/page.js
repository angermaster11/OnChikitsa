'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import { Camera, User, Phone, Mail, IndianRupee, Award, Briefcase, Shield, Check } from '../../_components/icons';
import { SPECIALIZATIONS, findDoctor } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const toForm = (d) => ({
  name: d.name, spec: d.spec, qual: d.qual, exp: d.exp,
  reg: d.reg, phone: d.phone, email: d.email, fee: String(d.fee),
});

export default function EditDoctor() {
  const router = useRouter();
  const [f, setF] = useState(() => toForm(findDoctor(null)));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    setF(toForm(findDoctor(qid)));
  }, []);

  function save(e) {
    e.preventDefault();
    tapLight();
    router.back();
  }

  return (
    <Screen>
      <TopBar title="Edit doctor" subtitle={f.name} />
      <div className="content">
        <form onSubmit={save} className="pad" style={{ paddingTop: 12, paddingBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <button
              type="button"
              className="up-tile"
              aria-label="Change doctor photo"
              style={{ width: 120, minHeight: 120, borderRadius: '50%' }}
            >
              <Camera size={24} />
              <span className="ut-hint">Change photo</span>
            </button>
          </div>

          <Field label="Full name" htmlFor="d-name" required lead={<User size={18} />}>
            <input id="d-name" className="input" placeholder="Dr. Full Name" value={f.name} onChange={set('name')} />
          </Field>

          <div className="field">
            <label className="field-label">Specialization <span className="field-req">*</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALIZATIONS.map((s) => {
                const on = f.spec === s;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${on ? '' : 'chip-plain'}`}
                    aria-pressed={on}
                    onClick={() => { tapLight(); setF((v) => ({ ...v, spec: s })); }}
                    style={{ minHeight: 44, padding: '0 15px', border: on ? '1.5px solid var(--primary)' : '1.5px solid transparent' }}
                  >
                    {on ? <Check size={14} /> : null}{s}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Qualification" htmlFor="d-qual" lead={<Award size={18} />}>
            <input id="d-qual" className="input" placeholder="MBBS, MD" value={f.qual} onChange={set('qual')} />
          </Field>

          <div className="field-row">
            <Field label="Experience" htmlFor="d-exp" lead={<Briefcase size={18} />}>
              <input id="d-exp" className="input" placeholder="10 yrs" value={f.exp} onChange={set('exp')} />
            </Field>
            <Field label="Reg. no." htmlFor="d-reg" lead={<Shield size={18} />}>
              <input id="d-reg" className="input" placeholder="MCI-00000" value={f.reg} onChange={set('reg')} />
            </Field>
          </div>

          <Field label="Phone" htmlFor="d-phone" lead={<Phone size={18} />}>
            <input id="d-phone" className="input" type="tel" inputMode="tel" placeholder="+91 90000 00000" value={f.phone} onChange={set('phone')} />
          </Field>

          <Field label="Email" htmlFor="d-email" lead={<Mail size={18} />}>
            <input id="d-email" className="input" type="email" placeholder="doctor@clinic.in" value={f.email} onChange={set('email')} />
          </Field>

          <Field label="Consultation fee" htmlFor="d-fee" lead={<IndianRupee size={18} />}>
            <input id="d-fee" className="input" type="number" inputMode="numeric" placeholder="800" value={f.fee} onChange={set('fee')} />
          </Field>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>Save changes</button>
        </form>
      </div>
    </Screen>
  );
}
