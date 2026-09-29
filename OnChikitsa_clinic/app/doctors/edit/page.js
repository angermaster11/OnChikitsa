'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import { Camera, User, Phone, Mail, Award, Briefcase, Shield, Check, X } from '../../_components/icons';
import { SPECIALIZATIONS } from '../../_lib/data';
import { tapLight, notify } from '../../_lib/haptic';
import { doctorApi, uploadToCloudinary } from '../../_lib/api';

const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
const cleanPhone = (v) => String(v || '').replace(/[^\d+]/g, '');

export default function EditDoctor() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [f, setF] = useState({ name: '', spec: '', qual: '', exp: '', reg: '', phone: '', email: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoFile, setPhotoFile] = useState(null); // newly picked file (optional)
  const [photoUrl, setPhotoUrl] = useState('');       // preview: existing remote url or a picked object url
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const photoInput = useRef(null);

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    setId(qid);
    let alive = true;
    (async () => {
      try {
        // No single-doctor endpoint for clinics — pull the list and match by id.
        const list = await doctorApi.list();
        const d = Array.isArray(list) ? list.find((x) => (x._id || x.id) === qid) : null;
        if (!alive) return;
        if (!d) { setNotFound(true); return; }
        setF({
          name: d.name || '',
          spec: d.specialization || '',
          qual: d.qualification || '',
          exp: Number.isFinite(d.experience) ? String(d.experience) : '',
          reg: d.registrationNo || '',
          phone: d.phone || '',
          email: d.email || '',
        });
        if (d.photo) setPhotoUrl(d.photo);
      } catch (e) {
        if (alive) setErr(e?.message || 'Could not load this doctor.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function pickPhoto(file) {
    if (!file) return;
    if (photoFile && photoUrl) URL.revokeObjectURL(photoUrl); // only revoke our own object urls
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setPct(0);
  }

  function clearPhoto(e) {
    e.stopPropagation();
    tapLight();
    if (photoFile && photoUrl) URL.revokeObjectURL(photoUrl);
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
      // Upload a newly-picked photo first (best-effort — a failed upload never blocks the save).
      let photo;
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
      if (photo) payload.photo = photo;

      await doctorApi.update(id, payload);
      notify('SUCCESS');
      router.replace(`/doctors/detail?id=${id}`);
    } catch (e2) {
      setBusy(false);
      setErr(e2?.message || 'Could not save changes. Please try again.');
    }
  }

  if (loading) {
    return (
      <Screen>
        <TopBar title="Edit doctor" />
        <div className="content">
          <p style={{ padding: '28px 4px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>Loading…</p>
        </div>
      </Screen>
    );
  }
  if (notFound) {
    return (
      <Screen>
        <TopBar title="Edit doctor" />
        <div className="content">
          <p style={{ padding: '28px 22px 14px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>
            This doctor no longer exists.
          </p>
          <div className="pad">
            <button className="btn btn-outline btn-block" onClick={() => { tapLight(); router.replace('/doctors'); }}>Back to doctors</button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Edit doctor" subtitle={f.name} />
      <div className="content">
        <form onSubmit={save} className="pad" style={{ paddingTop: 12, paddingBottom: 28 }}>
          <input ref={photoInput} type="file" accept="image/*" hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <button
              type="button"
              className="up-tile"
              aria-label="Change doctor photo (optional)"
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
            <Field label="Experience" htmlFor="d-exp" lead={<Briefcase size={18} />} trail={<span className="input-suffix">yrs</span>}>
              <input id="d-exp" className="input" inputMode="numeric" placeholder="10" value={f.exp} onChange={set('exp')} />
            </Field>
            <Field label="Reg. no." htmlFor="d-reg" optional lead={<Shield size={18} />}>
              <input id="d-reg" className="input" placeholder="MCI-12345" value={f.reg} onChange={set('reg')} />
            </Field>
          </div>

          <Field label="Phone" htmlFor="d-phone" optional lead={<Phone size={18} />}>
            <input id="d-phone" className="input" type="tel" inputMode="tel" placeholder="+919000000000" value={f.phone} onChange={set('phone')} />
          </Field>

          <Field label="Email" htmlFor="d-email" optional lead={<Mail size={18} />}>
            <input id="d-email" className="input" type="email" placeholder="doctor@clinic.in" value={f.email} onChange={set('email')} />
          </Field>

          {err && (
            <p role="alert" style={{ margin: '2px 2px 10px', fontSize: 13.5, fontWeight: 500, color: 'var(--danger)', lineHeight: 1.5 }}>
              {err}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </Screen>
  );
}
