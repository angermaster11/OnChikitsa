'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { ChevronLeft, User, Mail, Phone } from '../_components/icons';
import { flow } from '../_lib/flow';
import { userApi, ApiError } from '../_lib/api';
import { resolveRoute } from '../_lib/onboarding';
import styles from './register.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Legal links are set per-deployment via env (left unset → inert '#').
const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL || '#';
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || '#';
const extLink = (href) => (href && href !== '#' ? { href, target: '_blank', rel: 'noreferrer' } : { href: '#' });

export default function Register() {
  const router = useRouter();
  const [phone, setPhone] = useState({ dial: '+91', number: '' });
  const [f, setF] = useState({ first: '', last: '', email: '' });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = flow.getPhoneParts();
    if (!p.number) { router.replace('/login'); return; }
    setPhone(p);
  }, [router]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const emailOk = f.email.trim() === '' || EMAIL_RE.test(f.email.trim());
  const valid = f.first.trim().length >= 2 && f.last.trim().length >= 1 && emailOk;

  async function submit(e) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');

    const name = `${f.first.trim()} ${f.last.trim()}`;
    const email = f.email.trim();
    const phoneE164 = `${phone.dial}${phone.number}`.replace(/\s+/g, '');
    // Cache display fields locally for the dashboard greeting.
    flow.setProfile({
      first: f.first.trim(), last: f.last.trim(), name,
      email, phone: `${phone.dial} ${phone.number}`, marketing: agree,
    });

    try {
      await userApi.register({ name, phone: phoneE164, ...(email ? { email } : {}) });
      router.replace('/details');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        // A profile already exists for this verified identity — resume the flow.
        try { router.replace(await resolveRoute()); return; } catch { /* fall through */ }
      }
      const msg = err instanceof ApiError && err.code === 'PHONE_TAKEN'
        ? 'This number is already registered to another account.'
        : (err?.message || 'Could not create your account. Please try again.');
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.sky} aria-hidden="true" />
      <button className={styles.back} onClick={() => router.back()} aria-label="Go back">
        <ChevronLeft size={24} />
      </button>
      <div className={styles.body}>
        <h1 className={styles.title}>Finish signing up</h1>
        <p className={styles.sub}>We need a couple more details from you</p>
        <form onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>First name</label>
            <div className={styles.wrap}>
              <span className={styles.lead}><User size={19} /></span>
              <input className={styles.input} placeholder="Enter your first name"
                value={f.first} onChange={set('first')} autoComplete="given-name" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Last name</label>
            <div className={styles.wrap}>
              <span className={styles.lead}><User size={19} /></span>
              <input className={styles.input} placeholder="Enter your last name"
                value={f.last} onChange={set('last')} autoComplete="family-name" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email <span style={{ color: 'var(--muted-fg, #94a3b8)', fontWeight: 500 }}>(optional)</span></label>
            <div className={styles.wrap}>
              <span className={styles.lead}><Mail size={19} /></span>
              <input className={styles.input} type="email" inputMode="email" placeholder="Enter your email address"
                value={f.email} onChange={set('email')} autoComplete="email" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Mobile number</label>
            <div className={styles.mobileRow}>
              <span className={styles.dial}>{phone.dial}</span>
              <div className={`${styles.wrap} ${styles.mobileNum}`}>
                <span className={styles.lead}><Phone size={19} /></span>
                <input className={styles.input} value={phone.number} readOnly aria-label="Verified mobile number" />
              </div>
            </div>
          </div>

          <label className={styles.check}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span className={styles.box} aria-hidden="true" />
            <span className={styles.checkText}>I agree to receive marketing notifications with offers and news</span>
          </label>

          {error && (
            <p role="alert" style={{ margin: '4px 2px 0', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.primary} disabled={!valid || submitting}>
            {submitting ? 'Creating account…' : 'Agree and create account'}
          </button>
        </form>
        <p className={styles.legal}>
          By creating an account, you agree to OnChikitsa&apos;s <a {...extLink(TERMS_URL)}>Terms of Use</a> and <a {...extLink(PRIVACY_URL)}>Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
