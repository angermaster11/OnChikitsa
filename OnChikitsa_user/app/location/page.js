'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { MapPin, Clock, Building, Stethoscope, Navigation } from '../_components/icons';
import { userApi } from '../_lib/api';
import { checkLocationPermission, requestLocation, recordDecision } from '../_lib/permissions';
import styles from './location.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

// "directions" glyph the shared set doesn't carry.
const Route = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="5" r="2.4" />
    <path d="M8 18h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h4" />
  </svg>
);

function LocationArt() {
  return (
    <svg className={styles.art} viewBox="0 0 320 320" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="loScr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef3f8" />
        </linearGradient>
        <clipPath id="loClip"><rect x="104" y="86" width="118" height="210" rx="16" /></clipPath>
        <filter id="loSh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2b5fae" floodOpacity="0.22" />
        </filter>
      </defs>
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="58" cy="66" rx="46" ry="19" /><ellipse cx="256" cy="52" rx="40" ry="16" />
      </g>
      <g opacity="0.5">
        <rect x="18" y="214" width="42" height="82" rx="6" fill="#c3d4ea" />
        <rect x="250" y="198" width="46" height="98" rx="6" fill="#c3d4ea" />
        <rect x="286" y="228" width="28" height="68" rx="6" fill="#d3e0f1" />
      </g>
      <g>
        <circle cx="40" cy="266" r="14" fill="#7fc99a" />
        <rect x="37" y="274" width="6" height="18" fill="#8a6a52" />
        <circle cx="280" cy="252" r="16" fill="#7fc99a" />
        <rect x="277" y="261" width="6" height="20" fill="#8a6a52" />
      </g>
      <g transform="rotate(-8 163 190)" filter="url(#loSh)">
        <rect x="98" y="80" width="130" height="222" rx="22" fill="#e6ecf4" />
        <rect x="104" y="86" width="118" height="210" rx="16" fill="url(#loScr)" />
        <rect x="150" y="90" width="26" height="6" rx="3" fill="#c2ccd9" />
        <g clipPath="url(#loClip)">
          <rect x="104" y="86" width="118" height="210" fill="#eef2f6" />
          <rect x="112" y="150" width="34" height="30" rx="8" fill="#d6efd9" />
          <rect x="178" y="212" width="42" height="34" rx="8" fill="#d6efd9" />
          <path d="M104 200 Q150 180 222 210" stroke="#ffffff" strokeWidth="9" />
          <path d="M150 86 L150 296" stroke="#ffffff" strokeWidth="8" />
          <path d="M104 250 Q160 240 222 262" stroke="#dfe6ee" strokeWidth="6" />
        </g>
      </g>
      <g filter="url(#loSh)">
        <ellipse cx="163" cy="205" rx="20" ry="6" fill="#2b6fe0" opacity="0.25" />
        <path d="M163 128a26 26 0 0 0-26 26c0 19 26 46 26 46s26-27 26-46a26 26 0 0 0-26-26z" fill="#2f6bff" />
        <circle cx="163" cy="154" r="10" fill="#ffffff" />
      </g>
    </svg>
  );
}

export default function Location() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);

  // Persist the decision to the backend, then advance. Best-effort: a write
  // failure (e.g. offline) must not trap the user on this screen.
  async function finish(state, coords) {
    // Record locally first so the guard never re-nags — a "Skip" leaves the OS
    // permission at 'prompt', but the user HAS decided and must not see it again.
    recordDecision('location', state);
    try {
      await userApi.updateMe({
        locationPermission: state === 'granted' ? 'GRANTED' : 'DENIED',
        ...(coords ? { location: coords } : {}),
      });
    } catch {
      /* non-blocking */
    }
    router.replace('/notifications');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Skip the screen entirely if the permission is already decided.
      const state = await checkLocationPermission();
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
    const { state, coords } = await requestLocation();
    await finish(state, coords);
  }
  async function skip() {
    if (busy) return;
    setBusy(true);
    await finish('denied');
  }

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.hero}>
        <LocationArt />
        <div className={`${styles.chip} ${styles.chip1}`}>
          <span className={styles.chipIco} style={{ color: '#2f6bff' }}><Building size={18} /></span>
          <span className={styles.chipLbl}>Nearby<br />Clinics</span>
        </div>
        <div className={`${styles.chip} ${styles.chip2}`}>
          <span className={styles.chipIco} style={{ color: '#12a150' }}><Stethoscope size={18} /></span>
          <span className={styles.chipLbl}>Trusted<br />Doctors</span>
        </div>
        <div className={`${styles.chip} ${styles.chip3}`}>
          <span className={styles.chipIco} style={{ color: '#2f6bff' }}><Navigation size={16} /></span>
          <span className={styles.chipLbl}>Faster<br />Booking</span>
        </div>
      </div>

      <div className={styles.sheet}>
        <h1 className={styles.title}>Allow location access</h1>
        <p className={styles.sub}>
          Find nearby doctors and clinics, get the best options around you, and book appointments faster.
        </p>
        <div className={styles.features}>
          <div className={styles.feat}>
            <span className={`${styles.fIco} ${styles.blue}`}><MapPin size={22} /></span>
            <span className={styles.fLbl}>Find nearby clinics</span>
          </div>
          <div className={styles.feat}>
            <span className={`${styles.fIco} ${styles.green}`}><Route /></span>
            <span className={styles.fLbl}>Get accurate directions</span>
          </div>
          <div className={styles.feat}>
            <span className={`${styles.fIco} ${styles.amber}`}><Clock size={22} /></span>
            <span className={styles.fLbl}>Faster booking</span>
          </div>
        </div>
        <button className={styles.primary} onClick={allow} disabled={busy}>Allow location access</button>
        <button className={styles.secondary} onClick={skip} disabled={busy}>Skip for now</button>
      </div>
    </main>
  );
}
