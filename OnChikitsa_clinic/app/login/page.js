'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown } from '../_components/icons';
import { flow } from '../_lib/flow';
import { sendOtp } from '../_lib/auth';
import { resolveRoute } from '../_lib/onboarding';
import { tapLight } from '../_lib/haptic';
import styles from './login.module.css';

const COUNTRIES = [
  { dial: '+91', flag: '🇮🇳', len: 10 },
  { dial: '+1', flag: '🇺🇸', len: 10 },
  { dial: '+44', flag: '🇬🇧', len: 10 },
  { dial: '+971', flag: '🇦🇪', len: 9 },
  { dial: '+61', flag: '🇦🇺', len: 9 },
];

export default function Login() {
  const router = useRouter();
  const [ci, setCi] = useState(0);
  const [number, setNumber] = useState('');
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const country = COUNTRIES[ci];
  const digits = number.replace(/\D/g, '');
  const valid = digits.length === country.len;
  const showError = touched && number.length > 0 && !valid;

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setErr('');
    setBusy(true);
    tapLight();
    try {
      // Firebase wants an E.164 number: country code + digits, no spaces.
      const { autoVerified } = await sendOtp(`${country.dial}${digits}`);
      flow.setPhone(country.dial, digits);
      if (autoVerified) {
        // Android instant (SIM-based) verification already signed us in — skip
        // the code screen and route straight from the real session.
        router.replace(await resolveRoute());
        return;
      }
      router.push('/verify');
    } catch (e2) {
      setErr(e2?.message || 'Could not send the code. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className={styles.root}>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.sub}>Log in to view and manage your appointments</p>

      <form onSubmit={submit} noValidate>
        <label className={styles.label} htmlFor="phone">Phone Number</label>
        <div className={`${styles.phone} ${focus ? styles.focus : ''} ${showError ? styles.bad : ''}`}>
          <label className={styles.cc} aria-label="Country code">
            <span className={styles.flag} aria-hidden="true">{country.flag}</span>
            <span>{country.dial}</span>
            <span className={styles.chev}><ChevronDown size={16} /></span>
            <select value={ci} onChange={(e) => setCi(Number(e.target.value))} aria-label="Select country code">
              {COUNTRIES.map((c, idx) => <option key={c.dial} value={idx}>{c.flag} {c.dial}</option>)}
            </select>
          </label>
          <span className={styles.sep} />
          <input
            id="phone" className={styles.num} type="tel" inputMode="numeric" autoComplete="tel-national"
            placeholder="Enter your phone number" value={number} maxLength={country.len + 4}
            onChange={(e) => { setErr(''); setNumber(e.target.value); }}
            onFocus={() => setFocus(true)}
            onBlur={() => { setFocus(false); setTouched(true); }}
            disabled={busy}
          />
        </div>
        <span className={styles.msg}>{showError ? `Enter a valid ${country.len}-digit number` : ''}</span>

        {err ? (
          <p role="alert" style={{ margin: '2px 2px 10px', fontSize: 13.5, fontWeight: 500, color: 'var(--danger)', lineHeight: 1.5 }}>
            {err}
          </p>
        ) : null}

        <button type="submit" className={styles.primary} disabled={!valid || busy}>
          {busy ? 'Sending code…' : 'Continue'}
        </button>
      </form>

      <p className={styles.foot}>
        By logging in, you agree to our <Link href="/legal/terms">Terms & Conditions</Link> and <Link href="/legal/privacy">Privacy Policy</Link>
      </p>
    </main>
  );
}
