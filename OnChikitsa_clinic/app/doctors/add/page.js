'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import { Camera, User, Phone, Mail, IndianRupee, Award, Briefcase, Shield, Check, X } from '../../_components/icons';
import { SPECIALIZATIONS } from '../../_lib/data';
import { tapLight, notify } from '../../_lib/haptic';
import { doctorApi, uploadToCloudinary } from '../../_lib/api';

const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
const cleanPhone = (v) => String(v || '').replace(/[^\d+]/g, '');

export default function AddDoctor() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', spec: '', qual: '', exp: '', reg: '', phone: '', email: '', fee: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  // Photo is OPTIONAL throughout — a doctor can be saved without one.
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const photoInput = useRef(null);

  function pickPhoto(file) {
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setPct(0);
  }

  function clearPhoto(e) {
    e.stopPropagation();
    tapLight();
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(null); setPhotoUrl(''); setPct(0);
    if (photoInput.current) photoInput.current.value = '';
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (!f.name.trim() || !f.spec) {
      setErr('Please add the doctor’s name and specialization.');
      return;
    }
    setBusy(true);
    setErr('');
    tapLight();
    try {
      // Upload the (optional) photo first — the Cloudinary folder comes from the
      // clinic account, which already exists here. Best-effort: a failed upload
      // never blocks the save, the doctor is just created without a photo.
      let photo = '';
      if (photoFile) {
        try { photo = await uploadToCloudinary(photoFile, 'doctor', setPct); } catch { /* skip */ }
      }
      const payload = { name: f.name.trim(), specialization: f.spec };
      if (f.qual.trim()) payload.qualification = f.qual.trim();
      const exp = parseInt(digitsOnly(f.exp), 10);
      if (Number.isFinite(exp) && exp >= 0 && exp <= 80) payload.experience = exp;
      if (f.reg.trim()) payload.registrationNo = f.reg.trim();
      const phone = cleanPhone(f.phone);
      if (phone.replace(/\D/g, '').length >= 7) payload.phone = phone;
      if (f.email.trim()) payload.email = f.email.trim();
      const fee = parseInt(digitsOnly(f.fee), 10);
      if (Number.isFinite(fee) && fee >= 0) payload.consultationFee = fee;
      if (photo) payload.photo = photo;

      await doctorApi.create(payload);
      notify('SUCCESS');
      router.replace('/doctors');
    } catch (e2) {
      setBusy(false);
      setErr(e2?.message || 'Could not add the doctor. Please try again.');
    }
  }
  return (
    <Screen>
      <TopBar title="Add doctor" subtitle="New profile" />
      <div className="content">
        <form onSubmit={save} className="pad" style={{ paddingTop: 12, paddingBottom: 28 }}>
          <input ref={photoInput} type="file" accept="image/*" hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <button
              type="button"
              className="up-tile"
              aria-label="Upload doctor photo (optional)"
              onClick={() => { tapLight(); photoInput.current?.click(); }}
              style={{
                width: 120, minHeight: 120, borderRadius: '50%', position: 'relative', overflow: 'hidden',
                ...(photoUrl ? { backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
              }}
            >
              {photoUrl ? (
                <span role="button" tabIndex={0} aria-label="Remove photo" onClick={clearPhoto}
                  style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,25,0.6)', color: '#fff' }}>
                  <X size={14} />
                </span>
              ) : (
                <>
                  <Camera size={24} />
                  <span className="ut-hint">Add photo</span>
                </>
              )}
              {busy && photoFile && pct > 0 && pct < 100 && (
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(15,23,25,0.55)', padding: '3px 0' }}>{pct}%</span>
              )}
            </button>
          </div>
          <p style={{ textAlign: 'center', margin: '0 0 18px', fontSize: 12.5, color: 'var(--muted-fg)' }}>Photo is optional</p>

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
              <input id="d-exp" className="input" inputMode="numeric" placeholder="10 yrs" value={f.exp} onChange={set('exp')} />
            </Field>
            <Field label="Reg. no." htmlFor="d-reg" lead={<Shield size={18} />}>
              <input id="d-reg" className="input" placeholder="MCI-00000" value={f.reg} onChange={set('reg')} />
            </Field>
          </div>

          <Field label="Phone" htmlFor="d-phone" lead={<Phone size={18} />}>
            <input id="d-phone" className="input" type="tel" inputMode="tel" placeholder="+919000000000" value={f.phone} onChange={set('phone')} />
          </Field>

          <Field label="Email" htmlFor="d-email" lead={<Mail size={18} />}>
            <input id="d-email" className="input" type="email" placeholder="doctor@clinic.in" value={f.email} onChange={set('email')} />
          </Field>

          <Field label="Consultation fee" htmlFor="d-fee" lead={<IndianRupee size={18} />}>
            <input id="d-fee" className="input" type="number" inputMode="numeric" placeholder="800" value={f.fee} onChange={set('fee')} />
          </Field>

          {err && (
            <p role="alert" style={{ margin: '2px 2px 10px', fontSize: 13.5, fontWeight: 500, color: '#e5484d', lineHeight: 1.5 }}>
              {err}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </Screen>
  );
}
