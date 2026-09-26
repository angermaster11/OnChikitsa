'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Star, Home, Compass, Ticket, User,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { flow } from '../_lib/flow';
import { CLINICS } from '../_lib/clinics';
import styles from './explore.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
const FILTERS = [{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'booked', label: 'Booked' }, { key: 'closed', label: 'Closed' }];
const STATUS_LABEL = { active: 'Active', booked: 'Booked', closed: 'Closed' };
const STATUS_CLASS = { active: 'stActive', booked: 'stBooked', closed: 'stClosed' };

export default function Explore() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Same fast auth gate + onboarding guard as the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on Explore */ }
    })();
    return () => { cancelled = true; };
  }, [router]);
  const q = query.trim().toLowerCase();
  const list = CLINICS.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (!q) return true;
    return `${c.name} ${c.cat} ${c.area}`.toLowerCase().includes(q);
  });

  const open = (id) => { flow.setClinicId(id); router.push('/clinic'); };

  if (checking) return <main className={styles.screen} aria-busy="true" />;
  return (
    <main className={styles.screen}>
      <div className={styles.head}>
        <h1 className={styles.title}>Explore</h1>
        <p className={styles.sub}>Find clinics &amp; specialists near you</p>
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.search} role="search">
          <Search size={20} className={styles.mag} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clinics, specialities, areas" aria-label="Search clinics" />
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((fl) => (
          <button key={fl.key} className={`${styles.chip} ${filter === fl.key ? styles.on : ''}`} onClick={() => setFilter(fl.key)}>
            {fl.label}
          </button>
        ))}
      </div>

      <p className={styles.count}>{list.length} clinic{list.length === 1 ? '' : 's'}</p>

      {list.length === 0 ? (
        <p className={styles.empty}>No clinics found. Try a different search.</p>
      ) : (
        <div className={styles.list}>
          {list.map((c) => {
            const Glyph = GLYPHS[c.glyph] || Building;
            return (
              <button key={c.id} className={styles.item} onClick={() => open(c.id)}>
                <div className={`${styles.logo} ${styles[c.g]}`}>
                  <Glyph size={26} />
                </div>
                <div className={styles.body}>
                  <p className={styles.name}>{c.name}</p>
                  <p className={styles.meta}>{c.cat} · {c.area}</p>
                  <div className={styles.metaRow}>
                    <span className={styles.rate}><Star size={13} /> {c.rate}</span>
                    <span className={styles.dot}>•</span>
                    <span>{c.dist}</span>
                  </div>
                </div>
                <span className={`${styles.badge} ${styles[STATUS_CLASS[c.status]]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <nav className={styles.tabbar} aria-label="Primary">
        <button className={styles.tab} onClick={() => router.push('/dashboard')}>
          <Home size={22} /> Home
        </button>
        <button className={`${styles.tab} ${styles.active}`}>
          <Compass size={22} /> Explore
        </button>
        <button className={styles.tab} onClick={() => router.push('/bookings')}>
          <Ticket size={22} /> Bookings
        </button>
        <button className={styles.tab} onClick={() => router.push('/profile')}>
          <User size={22} /> Profile
        </button>
      </nav>
    </main>
  );
}
