'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { ChevronDown, Google, Check } from '../_components/icons';
import { flow } from '../_lib/flow';
import styles from './login.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const COUNTRIES = [
  { dial: '+91', flag: '🇮🇳', len: 10 },
  { dial: '+1', flag: '🇺🇸', len: 10 },
  { dial: '+44', flag: '🇬🇧', len: 10 },
  { dial: '+971', flag: '🇦🇪', len: 9 },
  { dial: '+61', flag: '🇦🇺', len: 9 },
  { dial: '+65', flag: '🇸🇬', len: 8 },
];

// Tilted appointment-card mockup for the sky hero.
function PhoneMock() {
  return (
    <div className={styles.phoneMock} aria-hidden="true">
      <span className={styles.notch} />
      <div className={styles.apptCard}>
        <span className={styles.apptLabel}>Your Appointment</span>
        <span className={styles.apptTime}>10:00 AM</span>
        <span className={styles.apptDoc}>Dr. Priya Sharma</span>
        <span className={styles.apptBadge}><Check size={13} /> Confirmed</span>
      </div>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [ci, setCi] = useState(0);
  const [number, setNumber] = useState('');
  const country = COUNTRIES[ci];
  const digits = number.replace(/\D/g, '');
  const valid = digits.length === country.len;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    flow.setPhone(country.dial, digits);
    router.push('/verify');
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to book appointments and manage your health easily.</p>
        <PhoneMock />
      </div>
      <div className={styles.sheet}>
        <h2 className={styles.sheetTitle}>Sign in</h2>
        <p className={styles.sheetSub}>Enter your phone number to continue</p>

        <form onSubmit={submit} noValidate>
          <div className={styles.phone}>
            <label className={styles.cc}>
              <span className={styles.flag}>{country.flag}</span>
              {country.dial}
              <span className={styles.chev}><ChevronDown size={16} /></span>
              <select value={ci} onChange={(e) => setCi(Number(e.target.value))} aria-label="Country code">
                {COUNTRIES.map((c, i) => <option key={c.dial} value={i}>{c.flag} {c.dial}</option>)}
              </select>
            </label>
            <span className={styles.sep} />
            <input
              className={styles.num}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={number}
              maxLength={country.len + 4}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.primary} disabled={!valid}>Get started</button>
        </form>

        <div className={styles.divider}><span>OR</span></div>

        <button type="button" className={styles.google}>
          <Google size={20} /> Continue with Google
        </button>

        <p className={styles.legal}>
          By continuing you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
