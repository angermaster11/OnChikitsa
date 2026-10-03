'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Calendar, ChevronDown, Phone } from '../_components/icons';
import { flow } from '../_lib/flow';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { userApi } from '../_lib/api';
import styles from './account.module.css';

const HEIGHTS = Array.from({ length: 71 }, (_, i) => 140 + i); // 140–210 cm
const WEIGHTS = Array.from({ length: 121 }, (_, i) => 30 + i); // 30–150 kg
const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Account() {
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  // Hydrate the form from the locally-stored profile (the UI's source of truth).
  useEffect(() => {
    const p = flow.getProfile() || {};
    setFirst(p.first || '');
    setLast(p.last || '');
    setEmail(p.email || '');
    setDob(p.dob || '');
    setGender(p.gender || '');
    setHeight(p.height ? String(p.height) : '');
    setWeight(p.weight ? String(p.weight) : '');
    const { dial, number } = flow.getPhoneParts();
    setPhone(number ? `${dial} ${number}` : '');
  }, []);

  // Same guard as the rest of the authed app, plus a fast local auth gate: never
  // render personal details to a logged-out user, and refresh the form from the
  // DB (resolveRoute caches the server profile into flow) once onboarding checks.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      try {
        const route = await resolveRoute();
        if (cancelled) return;
        if (route !== '/dashboard') { router.replace(route); return; }
        const p = flow.getProfile() || {};
        setFirst(p.first || '');
        setLast(p.last || '');
        setEmail(p.email || '');
        setDob(p.dob || '');
        setGender(p.gender || '');
        setHeight(p.height ? String(p.height) : '');
        setWeight(p.weight ? String(p.weight) : '');
      } catch { /* offline → keep showing the cached local data */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const initials =
    ([first, last].filter(Boolean).join(' ') || 'U').split(/\s+/).filter(Boolean)
      .slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U';
  const emailTrim = email.trim();
  const emailOk = emailTrim === '' || EMAIL_RE.test(emailTrim);
  const canSave = first.trim().length >= 1 && emailOk && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const prev = flow.getProfile() || {};
    const f = first.trim();
    const l = last.trim();
    const em = emailTrim;
    const h = height ? Number(height) : null;
    const w = weight ? Number(weight) : null;
    const name = [f, l].filter(Boolean).join(' ').trim();
    flow.setProfile({ ...prev, first: f, last: l, name, email: em, dob, gender, height: h, weight: w });

    // Push EVERYTHING the backend accepts. The server is the source of truth and
    // the next screen re-syncs from it, so any editable field we don't send here
    // (previously: name + email) would silently revert. That was the bug — half
    // the fields saved, half snapped back.
    const payload = { name };
    if (em) payload.email = em;                 // canSave guarantees it's valid
    if (dob) payload.dob = dob;
    if (h) payload.height = h;
    if (w) payload.weight = w;
    if (gender) payload.gender = gender.toUpperCase();
    try {
      await userApi.updateMe(payload);
    } catch (err) {
      // Don't leave the screen — on return the DB sync would wipe the local edit,
      // so a failed save must be surfaced, not swallowed.
      setSaving(false);
      setError(err?.message || 'Could not save — please check your connection and try again.');
      return;
    }
    setSaving(false);
    router.back();
  };
  if (checking) return <main className={styles.screen} aria-busy="true" />;
  return (
    <main className={styles.screen}>
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>Profile</h1>
      </div>

      <div className={styles.avatarWrap}>
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.avatarName}>{[first, last].filter(Boolean).join(' ') || 'Your account'}</span>
      </div>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>Personal details</p>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>First name</label>
            <input className={styles.input} value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Last name</label>
            <input className={styles.input} value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mobile number</label>
            <span className={styles.readonly}><Phone size={17} /> {phone || 'Not added'}</span>
            <span className={styles.lockNote}>Verified number — can’t be changed here</span>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Health details</p>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>Date of birth</label>
            <input className={styles.input} type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <div className={styles.chips}>
              {GENDERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.chip} ${gender === key ? styles.on : ''}`}
                  onClick={() => setGender(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Height</label>
            <div className={styles.selectRow}>
              <select className={styles.select} value={height} onChange={(e) => setHeight(e.target.value)}>
                <option value="">Select</option>
                {HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className={styles.unit}>cm</span>
              <ChevronDown size={18} className={styles.chev} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Weight</label>
            <div className={styles.selectRow}>
              <select className={styles.select} value={weight} onChange={(e) => setWeight(e.target.value)}>
                <option value="">Select</option>
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <span className={styles.unit}>kg</span>
              <ChevronDown size={18} className={styles.chev} />
            </div>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        {error && <p className={styles.err} role="alert">{error}</p>}
        <button className={styles.save} onClick={save} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </main>
  );
}
