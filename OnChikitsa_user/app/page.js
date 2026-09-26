'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { resolveRoute } from './_lib/onboarding';
import { getCurrentUser } from './_lib/auth';
import styles from './splash.module.css';

// Wordmark type — geometric rounded sans, matching the brand lockup.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

export default function Splash() {
  const router = useRouter();
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Kick the animation on the next frame so it always runs client-side.
    const raf = requestAnimationFrame(() => setPlay(true));

    // Resolve the destination via the central guard while the wordmark plays,
    // then leave once the minimum splash time has elapsed.
    const minDelay = reduce ? 1200 : 2200;
    const started = Date.now();
    (async () => {
      let route;
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
        route = await Promise.race([resolveRoute(), timeout]);
      } catch {
        // Backend unreachable or timed out: keep a signed-in user in the app,
        // otherwise start at the welcome screen.
        try { 
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
          route = (await Promise.race([getCurrentUser(), timeout])) ? '/dashboard' : '/welcome'; 
        } catch { 
          route = '/welcome'; 
        }
      }
      const wait = Math.max(0, minDelay - (Date.now() - started));
      setTimeout(() => { if (!cancelled) router.replace(route); }, wait);
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [router]);

  return (
    <main className={`${styles.root} ${poppins.className} ${play ? styles.play : ''}`}>
      <div className={styles.grad} aria-hidden="true">
        <div className={styles.gradFill} />
      </div>
      <div className={styles.stage}>
        <h1 className={`${styles.word} ${styles.dark}`}>OnChikitsa</h1>
        <span className={`${styles.word} ${styles.light}`} aria-hidden="true">OnChikitsa</span>
      </div>
    </main>
  );
}
