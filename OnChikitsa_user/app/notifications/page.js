'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { Bell, Calendar, HeartPulse } from '../_components/icons';
import { userApi } from '../_lib/api';
import { checkNotificationPermission, requestNotification, recordDecision } from '../_lib/permissions';
import styles from './notifications.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

function NotifArt() {
  return (
    <svg className={styles.art} viewBox="0 0 320 320" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="noScr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eaf1fb" />
        </linearGradient>
        <filter id="noSh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2b5fae" floodOpacity="0.22" />
        </filter>
      </defs>
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="62" cy="62" rx="44" ry="18" /><ellipse cx="258" cy="54" rx="38" ry="15" />
      </g>
      <g transform="rotate(6 163 190)" filter="url(#noSh)">
        <rect x="106" y="78" width="118" height="220" rx="24" fill="#e6ecf4" />
        <rect x="112" y="84" width="106" height="208" rx="18" fill="url(#noScr)" />
        <rect x="151" y="88" width="24" height="6" rx="3" fill="#c2ccd9" />
      </g>
      <g stroke="#9cc4ff" strokeWidth="3.4" strokeLinecap="round">
        <path d="M118 150 q-14 12 -14 30" /><path d="M106 140 q-20 16 -20 44" />
        <path d="M208 150 q14 12 14 30" /><path d="M220 140 q20 16 20 44" />
      </g>
      <g filter="url(#noSh)">
        <circle cx="163" cy="96" r="7" fill="#2f6bff" />
        <path d="M163 100c-22 0-37 16-37 42 0 26-9 34-17 46 0 4 3 6 7 6h94c4 0 7-2 7-6-8-12-17-20-17-46 0-26-15-42-37-42z" fill="#2f6bff" />
        <path d="M150 200a13 13 0 0 0 26 0z" fill="#2b5fe0" />
      </g>
      <g>
        <circle cx="197" cy="92" r="15" fill="#ff5a5f" />
        <text x="197" y="93" textAnchor="middle" dominantBaseline="central"
          fontSize="15" fontWeight="800" fill="#ffffff">3</text>
      </g>
    </svg>
  );
}

export default function Notifications() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);

  // Notifications are the final onboarding step: persist the decision, mark the
  // profile COMPLETED, then enter the app. Best-effort so offline never traps.
  async function finish(state) {
    // Record locally first so the guard never re-nags — a "Skip" leaves the OS
    // permission at 'prompt', but the user HAS decided and must not see it again.
    recordDecision('notification', state);
    try {
      await userApi.updateMe({
        notificationPermission: state === 'granted' ? 'GRANTED' : 'DENIED',
        onboardingStatus: 'COMPLETED',
      });
    } catch {
      /* non-blocking */
    }
    router.replace('/dashboard');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await checkNotificationPermission();
      if (cancelled) return;
      if (state !== 'prompt') { void finish(state); return; }
      setBusy(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function allow() {
    if (busy) return;
    setBusy(true);
    const { state } = await requestNotification();
    await finish(state);
  }
  async function skip() {
    if (busy) return;
    setBusy(true);
    await finish('denied');
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.hero}>
        <NotifArt />
        <div className={`${styles.chip} ${styles.chipToast}`}>
          <span className={styles.chipIco} style={{ color: '#12a150' }}><Calendar size={18} /></span>
          <span className={styles.chipLbl}>Appointment<br />confirmed</span>
        </div>
      </div>

      <div className={styles.sheet}>
        <h1 className={styles.title}>Allow notifications</h1>
        <p className={styles.sub}>
          Get appointment reminders, booking updates and important health alerts.
        </p>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={`${styles.rIco} ${styles.blue}`}><Bell size={22} /></span>
            <span className={styles.rText}>
              <span className={styles.rTitle}>Appointment reminders</span>
              <span className={styles.rSub}>Never miss your doctor appointments</span>
            </span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.rIco} ${styles.green}`}><Calendar size={22} /></span>
            <span className={styles.rText}>
              <span className={styles.rTitle}>Booking updates</span>
              <span className={styles.rSub}>Get real-time updates on your bookings</span>
            </span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.rIco} ${styles.amber}`}><HeartPulse size={22} /></span>
            <span className={styles.rText}>
              <span className={styles.rTitle}>Important health alerts</span>
              <span className={styles.rSub}>Receive tips, offers and useful updates</span>
            </span>
          </div>
        </div>
        <button className={styles.primary} onClick={allow} disabled={busy}>Allow notifications</button>
        <button className={styles.secondary} onClick={skip} disabled={busy}>Skip for now</button>
      </div>
    </main>
  );
}
