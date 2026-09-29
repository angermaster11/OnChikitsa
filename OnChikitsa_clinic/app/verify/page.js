'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '../_components/icons';
import { flow } from '../_lib/flow';
import { confirmOtp, sendOtp } from '../_lib/auth';
import { resolveRoute } from '../_lib/onboarding';
import { tapLight, notify } from '../_lib/haptic';
import styles from './verify.module.css';

const LEN = 6;

export default function Verify() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [secs, setSecs] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef(null);
  const { dial, number } = flow.getPhoneParts();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const full = code.length === LEN;

  function onChange(e) {
    setError(false);
    setCode(e.target.value.replace(/\D/g, '').slice(0, LEN));
  }

  async function verify(e) {
    e?.preventDefault();
    if (!full || verifying) return;
    setVerifying(true);
    setError(false);
    tapLight();
    try {
      await confirmOtp(code);
      notify('SUCCESS');
      flow.setAuthed();
      // resolveRoute() probes GET /clinic/me: existing → dashboard/notifications,
      // CLINIC_NOT_FOUND → /setup/clinic (first-time registration).
      router.replace(await resolveRoute());
    } catch (e2) {
      setError(true);
      setErrMsg(e2?.message || 'Incorrect code. Please try again.');
      setVerifying(false);
    }
  }

  async function resend() {
    if (secs > 0 || resending) return;
    setResending(true);
    setError(false);
    tapLight();
    try {
      await sendOtp(`${dial}${number}`);
      setSecs(30);
      setCode('');
      inputRef.current?.focus();
    } catch (e2) {
      setError(true);
      setErrMsg(e2?.message || 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className={styles.root}>
      <button className={styles.back} aria-label="Go back" onClick={() => { tapLight(); router.back(); }}>
        <ArrowLeft size={22} />
      </button>

      <h1 className={styles.title}>Enter 6-digit code</h1>
      <p className={styles.sub}>
        We sent a code to <b>{dial} {number || '·····'}</b>. To keep your account safe, do not share this code with anyone.
      </p>

      <form onSubmit={verify}>
        <label className={styles.label} htmlFor="otp">Verification code</label>
        <input
          id="otp" ref={inputRef}
          className={`${styles.code} ${error ? styles.bad : ''}`}
          type="tel" inputMode="numeric" autoComplete="one-time-code"
          maxLength={LEN} placeholder="------" value={code}
          onChange={onChange}
          aria-label="6-digit verification code"
        />

        <p className={`${styles.resend} ${error ? styles.err : ''}`}>
          {error
            ? (errMsg || 'Incorrect code. Please try again.')
            : secs > 0
              ? <>Didn&apos;t get the code? Resend in <b style={{ color: 'var(--fg)' }}>0:{String(secs).padStart(2, '0')}</b></>
              : <>Didn&apos;t get the code?{' '}
                  <button type="button" onClick={resend} disabled={resending}>
                    {resending ? 'Resending…' : 'Resend code'}
                  </button></>}
        </p>

        <button type="submit" className={styles.primary} disabled={!full || verifying}>
          {verifying ? 'Verifying…' : 'Continue'}
        </button>
        <button type="button" className={styles.secondary} onClick={() => { tapLight(); router.back(); }}>
          Change phone number
        </button>
      </form>
    </main>
  );
}
