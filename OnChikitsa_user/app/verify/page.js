'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { ChevronLeft } from '../_components/icons';
import { flow } from '../_lib/flow';
import { sendOtp, confirmOtp } from '../_lib/auth';
import { resolveRoute } from '../_lib/onboarding';
import { ApiError } from '../_lib/api';
import styles from './verify.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const LEN = 6;

export default function Verify() {
  const router = useRouter();
  const [phone, setPhone] = useState({ dial: '', number: '' });
  const [digits, setDigits] = useState(Array(LEN).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const inputs = useRef([]);
  const sentRef = useRef(false);

  useEffect(() => {
    const p = flow.getPhoneParts();
    if (!p.number) { router.replace('/login'); return; }
    setPhone(p);
    // Dispatch the SMS once on arrival (guard against React's double-invoke).
    if (!sentRef.current) {
      sentRef.current = true;
      void sendCode(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const code = digits.join('');
  const complete = code.length === LEN && digits.every(Boolean);

  async function sendCode(p) {
    setSending(true);
    setError('');
    try {
      const e164 = `${p.dial}${p.number}`.replace(/\s+/g, '');
      const { autoVerified } = await sendOtp(e164);
      if (autoVerified) {
        // Android instant verification already signed the user in.
        setLoading(true);
        router.replace(await resolveRoute());
        return;
      }
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err?.message || 'Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function setAt(idx, val) {
    const clean = val.replace(/\D/g, '');
    setError('');
    if (clean.length > 1) {
      const arr = clean.slice(0, LEN).split('');
      const nextD = Array(LEN).fill('');
      arr.forEach((c, k) => (nextD[k] = c));
      setDigits(nextD);
      inputs.current[Math.min(arr.length, LEN - 1)]?.focus();
      return;
    }
    const nextD = [...digits];
    nextD[idx] = clean;
    setDigits(nextD);
    if (clean && idx < LEN - 1) inputs.current[idx + 1]?.focus();
  }

  function onKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  }

  async function verify(e) {
    e?.preventDefault();
    if (!complete || loading) return;
    setLoading(true);
    setError('');
    try {
      await confirmOtp(code);
      // Central guard decides: new account → /register, else onboarding step.
      router.replace(await resolveRoute());
    } catch (err) {
      setLoading(false);
      const msg = err instanceof ApiError
        ? err.message
        : (err?.message || 'That code is incorrect. Please try again.');
      setError(msg);
      setDigits(Array(LEN).fill(''));
      inputs.current[0]?.focus();
    }
  }

  function resend() {
    if (sending || loading) return;
    setDigits(Array(LEN).fill(''));
    const p = flow.getPhoneParts();
    void sendCode(p);
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.sky} aria-hidden="true" />
      <button className={styles.back} onClick={() => router.replace('/login')} aria-label="Go back">
        <ChevronLeft size={24} />
      </button>

      <div className={styles.body}>
        <h1 className={styles.title}>Confirm your number</h1>
        <p className={styles.desc}>
          We sent you a code to <b>{phone.dial} {phone.number}</b>
        </p>

        <form onSubmit={verify}>
          <div className={styles.otpRow} onPaste={(e) => setAt(0, e.clipboardData.getData('text'))}>
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                className={`${styles.otpBox} ${d ? styles.filled : ''} ${error ? styles.bad : ''}`}
                type="tel"
                inputMode="numeric"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={d}
                onChange={(e) => setAt(idx, e.target.value)}
                onKeyDown={(e) => onKeyDown(idx, e)}
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>
          {error && <p className={styles.errMsg} role="alert">{error}</p>}

          <button type="submit" className={styles.primary} disabled={!complete || loading || sending}>
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>

        <p className={styles.resend}>
          {sending ? 'Sending code…' : "Didn't receive a code?"}{' '}
          <button type="button" onClick={resend} disabled={sending || loading}>
            {sending ? 'Please wait' : 'Resend code'}
          </button>
        </p>
      </div>
    </main>
  );
}
