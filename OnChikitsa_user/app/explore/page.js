'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Home, Compass, Ticket, User, AlertCircle,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { flow } from '../_lib/flow';
import { clinicApi, ApiError } from '../_lib/api';
import { mapClinicCard } from '../_lib/clinicMap';
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
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // City chosen on the location picker → drives the backend `?city=` filter.
  const [city, setCity] = useState('');

  // Reflect the picked city on mount and whenever we return to this screen.
  useEffect(() => {
    const read = () => { try { setCity(flow.getCity()); } catch { setCity(''); } };
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  // Seed the search from a ?specialty= deep-link (e.g. a dashboard category tap).
  // Read from the URL directly so static export needs no Suspense boundary.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search).get('specialty');
      if (sp) setQuery(sp);
    } catch { /* no-op */ }
  }, []);

  // Fast auth gate + onboarding guard (the clinic API needs a signed-in token).
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

  // Load the real clinic directory, filtered by the chosen city. Re-runs when the
  // city changes (or is cleared via "All cities") so the list broadens live.
  useEffect(() => {
    if (checking) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const rows = await clinicApi.list(city ? { city } : {});
        if (!cancelled) setClinics((rows || []).map(mapClinicCard));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load clinics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [checking, city]);

  const q = query.trim().toLowerCase();
  const list = clinics.filter((c) => {
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

      {loading ? (
        <p className={styles.count}>Loading clinics…</p>
      ) : error ? (
        <div className={styles.stateBox}>
          <AlertCircle size={26} />
          <p>{error}</p>
        </div>
      ) : (
        <>
          <p className={styles.count}>{list.length} clinic{list.length === 1 ? '' : 's'}</p>
          {list.length === 0 ? (
            <p className={styles.empty}>No clinics found. Try a different search.</p>
          ) : (
            <div className={styles.list}>
              {list.map((c) => {
                const Glyph = GLYPHS[c.glyph] || Building;
                return (
                  <button key={c.id} className={styles.item} onClick={() => open(c.id)}>
                    <div className={`${styles.logo} ${!c.logo ? styles[c.g] : ''}`}>
                      {c.logo ? (
                        <img src={c.logo} alt="" className={styles.imgLogo} />
                      ) : (
                        <Glyph size={26} />
                      )}
                    </div>
                    <div className={styles.body}>
                      <p className={styles.name}>{c.name}</p>
                      <p className={styles.meta}>{c.cat} · {c.area}</p>
                      <div className={styles.metaRow}>
                        <span className={styles.rate}><Stethoscope size={13} /> {c.doctorsCount} doctor{c.doctorsCount === 1 ? '' : 's'}</span>
                        {c.status === 'active' && (
                          <>
                            <span className={styles.dot}>•</span>
                            <span>{c.seats} seat{c.seats === 1 ? '' : 's'} today</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.rightWrap}>
                      {c.ratingAvg > 0 && (
                        <span className={styles.ratingBadge}>★ {c.ratingAvg.toFixed(1)}</span>
                      )}
                      <span className={`${styles.badge} ${styles[STATUS_CLASS[c.status]]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
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
