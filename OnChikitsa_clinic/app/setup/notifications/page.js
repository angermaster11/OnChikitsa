'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tapLight, notify } from '../../_lib/haptic';
import { requestNotification, recordDecision } from '../../_lib/permissions';
import styles from './notifications.module.css';

// Calendar cells: [x, y, fill]. A couple are tinted to look "booked".
const CAL = [
  [114, 200, '#e5eff0'], [134, 200, '#8fe0ca'], [154, 200, '#e5eff0'], [174, 200, '#e5eff0'],
  [114, 220, '#e5eff0'], [134, 220, '#34c6a8'], [154, 220, '#e5eff0'], [174, 220, '#e5eff0'],
  [114, 240, '#e5eff0'], [134, 240, '#e5eff0'], [154, 240, '#e5eff0'], [174, 240, '#cdeee6'],
];

function Art() {
  return (
    <svg className={styles.art} viewBox="0 0 320 300" fill="none" role="img"
      aria-label="Clinic notifications illustration" style={{ fontFamily: 'inherit' }}>
      <defs>
        <linearGradient id="mA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafaf4" /><stop offset="1" stopColor="#d3f3e8" />
        </linearGradient>
        <linearGradient id="mB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c2efe0" /><stop offset="1" stopColor="#9ce4cf" />
        </linearGradient>
        <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#edf8f4" />
        </linearGradient>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#0f6f60" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* backdrop diamonds */}
      <g opacity="0.95">
        <rect x="55" y="35" width="210" height="210" rx="46" fill="url(#mA)" transform="rotate(45 160 140)" />
        <rect x="55" y="55" width="130" height="130" rx="34" fill="url(#mB)" transform="rotate(45 120 120)" />
        <rect x="135" y="55" width="130" height="130" rx="34" fill="url(#mB)" transform="rotate(45 200 120)" />
      </g>

      {/* phone */}
      <rect x="109" y="42" width="102" height="196" rx="24" fill="#1b1e29" />
      <rect x="116" y="49" width="88" height="182" rx="17" fill="url(#scr)" />
      <rect x="146" y="55" width="28" height="7" rx="3.5" fill="#1b1e29" />

      {/* calendar (slightly tilted) */}
      <g transform="rotate(-7 150 214)" filter="url(#sh)">
        <rect x="104" y="170" width="94" height="90" rx="14" fill="#ffffff" />
        <path d="M104 190v-6a14 14 0 0 1 14-14h66a14 14 0 0 1 14 14v6z" fill="#34c6a8" />
        <rect x="124" y="163" width="6" height="14" rx="3" fill="#2a3342" />
        <rect x="172" y="163" width="6" height="14" rx="3" fill="#2a3342" />
        {CAL.map(([cx, cy, f], i) => (
          <rect key={i} x={cx} y={cy} width="14" height="14" rx="4" fill={f} />
        ))}
      </g>

      {/* notification toast */}
      <g filter="url(#sh)"><rect x="34" y="82" width="252" height="66" rx="16" fill="#ffffff" /></g>
      <rect x="46" y="94" width="42" height="42" rx="12" fill="#d9f5ec" />
      <rect x="64" y="100" width="6" height="30" rx="3" fill="#00b3a1" />
      <rect x="52" y="112" width="30" height="6" rx="3" fill="#00b3a1" />
      <text x="98" y="110" fontSize="14.5" fontWeight="700" fill="#1a1d29">OnChikitsa</text>
      <text x="274" y="108" textAnchor="end" fontSize="11" fontWeight="500" fill="#9aa1ad">Just now</text>
      <rect x="98" y="118" width="150" height="8" rx="4" fill="#eef1f5" />
      <rect x="98" y="132" width="104" height="8" rx="4" fill="#eef1f5" />

      {/* bell badge */}
      <g filter="url(#sh)"><circle cx="238" cy="228" r="30" fill="#ffffff" /></g>
      <path d="M238 214a10 10 0 0 0-10 10c0 6-2 8-3.5 9.5h27c-1.5-1.5-3.5-3.5-3.5-9.5a10 10 0 0 0-10-10z" fill="#00b3a1" />
      <path d="M233 236a5 5 0 0 0 10 0" stroke="#00b3a1" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="238" cy="211" r="2" fill="#00b3a1" />

      {/* sparkles */}
      <g stroke="#34c6a8" strokeWidth="3.5" strokeLinecap="round">
        <path d="M278 60l6-6" /><path d="M286 68l8-3" /><path d="M282 74l3 8" />
      </g>
      <g stroke="#34c6a8" strokeWidth="3" strokeLinecap="round">
        <path d="M266 198l5-5" /><path d="M274 204l7-2" />
      </g>
    </svg>
  );
}

export default function NotificationsSetup() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Hardware / browser back on this terminal screen = skip → dashboard.
  useEffect(() => {
    window.history.pushState(null, '');
    const onPop = () => router.replace('/dashboard');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);

  function done() {
    notify('SUCCESS');
    router.replace('/dashboard');
  }

  async function enable() {
    if (busy) return;
    setBusy(true);
    tapLight();
    // Native push (Android/iOS) via @capacitor/push-notifications; the browser
    // falls back to the Web Notification API. Either way the decision is recorded
    // locally so the funnel never re-nags the clinic.
    let state = 'denied';
    try {
      ({ state } = await requestNotification());
    } catch {
      /* treat a failure as undecided-but-dismissed */
    }
    recordDecision('notification', state);
    done();
  }

  function skip() {
    if (busy) return;
    tapLight();
    // "Skip" is an explicit user decision — record it so we never ask again.
    recordDecision('notification', 'denied');
    done();
  }

  return (
    <main className={styles.root}>
      <div className={styles.hero}>
        <Art />
        <h1 className={styles.title}>Stay updated with your clinic</h1>
        <p className={styles.sub}>
          Get instant notifications for new appointments, booking updates,
          cancellations, and important clinic reminders.
        </p>
      </div>

      <div className={styles.footer}>
        <button className={styles.primary} onClick={enable} disabled={busy}>
          Turn on notifications
        </button>
        <button className={styles.secondary} onClick={skip} disabled={busy}>
          Skip for now
        </button>
      </div>
    </main>
  );
}
