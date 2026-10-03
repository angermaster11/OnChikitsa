'use client';

import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import styles from './welcome.module.css';

// Brand wordmark/type — same family as the splash so the flow reads as one.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

// A single laurel half — mirrored with `flip` to frame each stat.
function Laurel({ flip }) {
  return (
    <svg className={styles.laurel} viewBox="0 0 44 66" aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M31 62C15 53 11 32 24 6" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" />
      {[[25, 10, -32], [21, 20, -20], [18, 30, -6], [18, 40, 8], [21, 50, 22], [26, 58, 36]].map(
        ([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="3.1" ry="6.2" fill="currentColor"
            transform={`rotate(${r} ${x} ${y})`} />
        )
      )}
    </svg>
  );
}

const BEFORE = [66, 52, 82, 58, 74];
const NOW = [30, 22, 34, 24, 30];

export default function Welcome() {
  const router = useRouter();
  const go = (r) => () => router.push(r);

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.collage}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Laurel />
            <span className={styles.statMid}>
              <span className={styles.statNum}>Verified</span>
              <span className={styles.statLbl}>Partner clinics</span>
            </span>
            <Laurel flip />
          </div>
          <div className={styles.stat}>
            <Laurel />
            <span className={styles.statMid}>
              <span className={styles.statNum}>Minutes</span>
              <span className={styles.statLbl}>To book a visit</span>
            </span>
            <Laurel flip />
          </div>
        </div>

        <div className={styles.quote}>
          <p className={styles.quoteText}>&ldquo;Book a real-time token and skip the waiting-room queue.&rdquo;</p>
          <span className={styles.quoteBy}>How OnChikitsa works</span>
        </div>

        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.before}`}>
            <span className={styles.cardTag}>Before</span>
            <span className={styles.cardTime}>2h 15m</span>
            <span className={styles.bars}>
              {BEFORE.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
            </span>
          </div>
          <div className={`${styles.card} ${styles.now}`}>
            <span className={styles.cardTag}>Now</span>
            <span className={styles.cardTime}>5m</span>
            <span className={styles.bars}>
              {NOW.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.sheet}>
        <h1 className={styles.title}>
          Book your appointment<br />
          <span className={styles.blue}>Skip queue</span>
        </h1>
        <p className={styles.sub}>
          Find trusted doctors and book appointments instantly, without waiting in long queues.
        </p>
        <button className={styles.primary} onClick={go('/login')}>Get started</button>
        <button className={styles.ghost} onClick={go('/login')}>I already have an account</button>
      </div>
    </main>
  );
}
