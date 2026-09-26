'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { ChevronLeft, ChevronDown, Calendar, User } from '../_components/icons';
import { flow } from '../_lib/flow';
import { userApi } from '../_lib/api';
import styles from './details.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const HEIGHTS = Array.from({ length: 71 }, (_, i) => 140 + i); // 140–210 cm
const WEIGHTS = Array.from({ length: 121 }, (_, i) => 30 + i); // 30–150 kg

// Gender glyphs the shared icon set doesn't carry.
const g = {
  width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
};
const Mars = () => (<svg {...g}><circle cx="9" cy="15" r="6" /><path d="M13.5 10.5 20 4M20 4h-5M20 4v5" /></svg>);
const Venus = () => (<svg {...g}><circle cx="12" cy="8" r="6" /><path d="M12 14v7M9 18h6" /></svg>);

const GENDERS = [
  { key: 'male', label: 'Male', Ico: Mars, color: '#2f6bff' },
  { key: 'female', label: 'Female', Ico: Venus, color: '#ec4899' },
  { key: 'other', label: 'Other', Ico: User, color: '#6b7280' },
];

export default function Details() {
  const router = useRouter();
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(next) {
    if (saving) return;
    setSaving(true);
    const prev = flow.getProfile() || {};
    const h = height ? Number(height) : null;
    const w = weight ? Number(weight) : null;
    flow.setProfile({ ...prev, dob, height: h, weight: w, gender });

    // Mirror the demographics to the backend (PATCH /me). Best-effort: these are
    // optional, so a failure here must not block the funnel — the profile already
    // exists and the guard doesn't depend on them.
    const payload = {};
    if (dob) payload.dob = dob;
    if (h) payload.height = h;
    if (w) payload.weight = w;
    if (gender) payload.gender = gender.toUpperCase(); // MALE | FEMALE | OTHER
    try {
      if (Object.keys(payload).length) await userApi.updateMe(payload);
    } catch {
      /* non-blocking */
    }
    router.replace(next);
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.top}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <button className={styles.skip} onClick={() => router.replace('/location')}>Skip</button>
      </div>
      <div className={styles.body}>
        <h1 className={styles.title}>A few more details</h1>
        <p className={styles.sub}>Help us give you a better and more personalized experience</p>

        <div className={styles.field}>
          <label className={styles.label}>Date of birth</label>
          <div className={styles.wrap}>
            <span className={styles.lead}><Calendar size={19} /></span>
            <input className={`${styles.input} ${dob ? '' : styles.empty}`} type="date"
              value={dob} onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Height</label>
          <div className={styles.selectWrap}>
            <select className={`${styles.select} ${height ? '' : styles.empty}`}
              value={height} onChange={(e) => setHeight(e.target.value)} aria-label="Height in cm">
              <option value="" disabled>Select your height</option>
              {HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className={styles.selchev}><ChevronDown size={20} /></span>
            <span className={styles.unitSep} />
            <span className={styles.unit}>cm</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Weight</label>
          <div className={styles.selectWrap}>
            <select className={`${styles.select} ${weight ? '' : styles.empty}`}
              value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight in kg">
              <option value="" disabled>Select your weight</option>
              {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <span className={styles.selchev}><ChevronDown size={20} /></span>
            <span className={styles.unitSep} />
            <span className={styles.unit}>kg</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Gender</label>
          <div className={styles.genders}>
            {GENDERS.map(({ key, label, Ico, color }) => (
              <button key={key} type="button" aria-pressed={gender === key}
                className={`${styles.gender} ${gender === key ? styles.genderOn : ''}`}
                onClick={() => setGender(key)}>
                <span className={styles.genderIco} style={{ color }}><Ico /></span>
                <span className={styles.genderLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.primary} onClick={() => save('/location')} disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </main>
  );
}
