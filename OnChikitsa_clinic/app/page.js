'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flow } from './_lib/flow';
import { resolveRoute } from './_lib/onboarding';
import styles from './splash.module.css';

export default function Splash() {
  const router = useRouter();
  const rootRef = useRef(null);
  const logoRef = useRef(null);
  const [dx, setDx] = useState(0);   // px the logo starts right-of-final (== screen-centred)
  const [run, setRun] = useState(false);

  // Start the reveal only once the wordmark font is ready, so the measured
  // shift matches the final rendered width and the lockup stays truly centred.
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const root = rootRef.current;
      const logo = logoRef.current;
      if (root && logo) {
        const rc = root.getBoundingClientRect();
        const lc = logo.getBoundingClientRect();
        // How far the logo's (final) centre sits left of the lockup centre —
        // translate it right by that much so it appears dead-centre, then let
        // it glide back to 0 while the wordmark reveals.
        const shift = (rc.left + rc.width / 2) - (lc.left + lc.width / 2);
        if (Number.isFinite(shift)) setDx(shift);
      }
      // Two frames so the initial transform paints before transitions kick in.
      requestAnimationFrame(() => requestAnimationFrame(() => setRun(true)));
    };

    const ready = document.fonts && document.fonts.ready;
    if (ready) ready.then(start).catch(start);
    const fallback = setTimeout(start, 400); // fonts.ready never resolving
    return () => clearTimeout(fallback);
  }, []);

  // Navigate onward once the animation has settled. First-time users (never
  // onboarded on this device) still see the marketing intro; everyone else is
  // routed by the real Firebase session + backend probe via resolveRoute().
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (!alive) return;
      if (!flow.isOnboarded()) { router.replace('/onboarding'); return; }
      try {
        const route = await resolveRoute();
        if (alive) router.replace(route);
      } catch {
        // Network/server error confirming the account — fall back to login so
        // the user is never trapped on the splash.
        if (alive) router.replace('/login');
      }
    }, 1750);
    return () => { alive = false; clearTimeout(t); };
  }, [router]);

  return (
    <main
      ref={rootRef}
      className={`${styles.root} ${run ? styles.run : ''}`}
      role="img"
      aria-label="OnChikitsa"
    >
      <div className={styles.lockup} style={{ '--dx': `${dx}px` }}>
        <img ref={logoRef} className={styles.logo} src="/splash/logo.png" alt="" draggable="false" />
        <span className={styles.word} aria-hidden="true">OnChikitsa</span>
      </div>
    </main>
  );
}
