'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import { flow } from '../_lib/flow';
import { tapLight } from '../_lib/haptic';
import styles from './onboarding.module.css';

// Same wordmark family as the splash so onboarding reads as one product.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const SLIDES = [
  {
    img: '/onboarding/reach.png',
    title: 'Reach More Patients',
    text: 'Connect with patients looking for trusted healthcare services and grow your clinic.',
  },
  {
    img: '/onboarding/appointments.png',
    title: 'Manage Appointments Easily',
    text: 'View, accept, reschedule and manage all your patient appointments in one place.',
  },
  {
    img: '/onboarding/grow.png',
    title: 'Grow Your Clinic',
    text: "Build your clinic's online presence, manage patient relationships and deliver better care.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const startX = useRef(null);
  const last = i === SLIDES.length - 1;

  function finish() { flow.setOnboarded(); router.replace('/login'); }
  function next() { tapLight(); if (last) finish(); else setI((v) => v + 1); }

  function onTouchStart(e) { startX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -45 && !last) setI((v) => v + 1);
    if (dx > 45 && i > 0) setI((v) => v - 1);
    startX.current = null;
  }

  const s = SLIDES[i];
  return (
    <main
      className={`${styles.root} ${poppins.className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.art}>
        <div className={styles.panel}>
          <img key={`img-${i}`} className={styles.illus} src={s.img} alt="" draggable="false" />
        </div>
      </div>

      <div key={`copy-${i}`} className={styles.copy}>
        <h1 className={styles.title}>{s.title}</h1>
        <p className={styles.text}>{s.text}</p>
      </div>

      <div className={styles.dots} role="tablist" aria-label="Onboarding progress">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`${styles.dot} ${idx === i ? styles.active : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={next}>
          {last ? 'Get Started' : 'Next'}
        </button>
        <button className={styles.skip} onClick={finish}>
          Skip for now
        </button>
      </div>
    </main>
  );
}
