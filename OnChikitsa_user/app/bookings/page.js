'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Calendar, Ticket, Home, Compass, User,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { getLiveBookings, getPastBookings, queueStatus } from '../_lib/bookings';
import styles from './bookings.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };

export default function Bookings() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('live');
  const [live, setLive] = useState([]);
  const [past, setPast] = useState([]);

  // Same fast auth gate + onboarding guard as the rest of the app. Bookings come
  // from a client-only lib (localStorage), so they're read after the mount check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setLive(getLiveBookings());
      setPast(getPastBookings());
      setChecking(false);
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on the bookings screen */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <h1 className={styles.title}>Bookings</h1>
        <p className={styles.sub}>Track your live queue and past visits</p>
      </header>

      <div className={styles.tabs} role="tablist">
        <button className={`${styles.tabBtn} ${tab === 'live' ? styles.on : ''}`} onClick={() => setTab('live')}>
          {tab === 'live' && <span className={styles.liveDot} />} Live
        </button>
        <button className={`${styles.tabBtn} ${tab === 'past' ? styles.on : ''}`} onClick={() => setTab('past')}>
          Past
        </button>
      </div>

      {tab === 'live' && (
        <div className={styles.list}>
          {live.length === 0
            ? <Empty icon={<Ticket size={26} />} title="No live bookings" sub="Book a clinic from Explore to see your queue here." />
            : live.map((b) => <LiveCard key={b.id} b={b} />)}
        </div>
      )}

      {tab === 'past' && (
        <div className={styles.list}>
          {past.length === 0
            ? <Empty icon={<Clock size={26} />} title="No past visits" sub="Your completed and cancelled bookings will show up here." />
            : past.map((b) => <PastCard key={b.id} b={b} />)}
        </div>
      )}

      <nav className={styles.tabbar}>
        <button className={styles.tab} onClick={() => router.push('/dashboard')}><Home size={22} /> Home</button>
        <button className={styles.tab} onClick={() => router.push('/explore')}><Compass size={22} /> Explore</button>
        <button className={`${styles.tab} ${styles.active}`}><Ticket size={22} /> Bookings</button>
        <button className={styles.tab} onClick={() => router.push('/profile')}><User size={22} /> Profile</button>
      </nav>
    </main>
  );
}

// A live booking = a clinic queue. Show your token vs the token being served,
// the booked + expected times, and a friendly status derived from how many are
// ahead of you (queueStatus).
function LiveCard({ b }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  const st = queueStatus(b);
  return (
    <article className={styles.liveCard}>
      <div className={styles.cardHead}>
        <span className={`${styles.logo} ${styles[b.g]}`}><Glyph size={26} /></span>
        <div className={styles.hBody}>
          <h2 className={styles.name}>{b.clinic}</h2>
          <p className={styles.meta}>{b.cat} · {b.area}</p>
        </div>
        <span className={styles.liveTag}><span className={styles.liveDot} /> LIVE</span>
      </div>

      <div className={styles.queue}>
        <div className={`${styles.qCell} ${styles.you}`}>
          <p className={styles.qLabel}>Your token</p>
          <p className={styles.qNum}>{b.queueNo}</p>
        </div>
        <span className={styles.qDiv} />
        <div className={styles.qCell}>
          <p className={styles.qLabel}>Now serving</p>
          <p className={styles.qNum}>{b.currentNo}</p>
        </div>
      </div>

      <div className={styles.times}>
        <div className={styles.timeCell}>
          <Calendar size={18} />
          <div><p className={styles.tLabel}>Booked</p><p className={styles.tVal}>{b.timing}</p></div>
        </div>
        <div className={styles.timeCell}>
          <Clock size={18} />
          <div><p className={styles.tLabel}>Expected</p><p className={styles.tVal}>{b.expected}</p></div>
        </div>
      </div>

      <div className={`${styles.status} ${st.soon ? styles.soon : styles.wait}`}>
        {st.label}
        <span className={styles.waitTxt}>
          {st.ahead > 0 ? `${st.ahead} ahead · ~${st.wait} min` : 'Head to the clinic'}
        </span>
      </div>
    </article>
  );
}

function PastCard({ b }) {
  const Glyph = GLYPHS[b.glyph] || Building;
  const cancelled = b.outcome === 'cancelled';
  return (
    <article className={styles.pastCard}>
      <span className={`${styles.pastLogo} ${styles[b.g]}`}><Glyph size={24} /></span>
      <div className={styles.pastBody}>
        <h2 className={styles.pastName}>{b.clinic}</h2>
        <p className={styles.pastMeta}>{b.cat} · {b.date} · {b.timing}</p>
      </div>
      <span className={`${styles.pastBadge} ${cancelled ? styles.cancel : styles.ok}`}>
        {cancelled ? 'Cancelled' : 'Completed'}
      </span>
    </article>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySub}>{sub}</p>
    </div>
  );
}
