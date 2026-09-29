'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, ChevronDown, Bell, Search, Heart, Home, Compass, Ticket, User,
  Grid, Stethoscope, Tooth, HeartPulse, Baby, Sparkles, Eye, Ear, Bone, Brain,
  Activity, Leaf, Flask, Pill, Syringe, Emergency, Building,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { flow } from '../_lib/flow';
import { unreadCount } from '../_lib/notifications';
import { getCurrentUser } from '../_lib/auth';
import { clinicApi, ApiError } from '../_lib/api';
import { mapClinicCard } from '../_lib/clinicMap';
import styles from './dashboard.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
const STATUS_LABEL = { active: 'Active', booked: 'Fully booked', closed: 'Closed' };

const CATEGORIES = [
  { Icon: Grid, label: 'All' },
  { Icon: Stethoscope, label: 'General' },
  { Icon: Tooth, label: 'Dental' },
  { Icon: HeartPulse, label: 'Cardiology' },
  { Icon: Baby, label: 'Pediatrics' },
  { Icon: Sparkles, label: 'Dermatology' },
  { Icon: Eye, label: 'Eye Care' },
  { Icon: Ear, label: 'ENT' },
  { Icon: Bone, label: 'Orthopedic' },
  { Icon: Brain, label: 'Neurology' },
  { Icon: Activity, label: 'Physio' },
  { Icon: Leaf, label: 'Nutrition' },
  { Icon: Flask, label: 'Lab Tests' },
  { Icon: Pill, label: 'Pharmacy' },
  { Icon: Syringe, label: 'Vaccination' },
  { Icon: Emergency, label: 'Emergency' },
];
export default function Dashboard() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [favs, setFavs] = useState({});
  const [locLabel, setLocLabel] = useState('Current location');
  const [city, setCity] = useState('');
  const [unread, setUnread] = useState(0);
  const [checking, setChecking] = useState(true);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reflect the location + city chosen on the picker (falls back to the generic
  // label; empty city → no filter). Re-read on refocus so a pick applies live.
  useEffect(() => {
    const read = () => {
      setLocLabel(flow.getLocation() || 'Current location');
      try { setCity(flow.getCity()); } catch { setCity(''); }
    };
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  // Keep the bell's unread dot honest — recompute on mount and on refocus.
  useEffect(() => {
    const read = () => { try { setUnread(unreadCount()); } catch { setUnread(0); } };
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  // Central onboarding guard (the clinic API needs a signed-in token).
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
      } catch { /* stay put on network/server errors */ }
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

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const toggleFav = (id) => setFavs((f) => ({ ...f, [id]: !f[id] }));
  const open = (id) => { flow.setClinicId(id); router.push('/clinic'); };

  const featured = clinics.slice(0, 6);
  const more = clinics.slice(6);

  // A real clinic → the tall rail card. No ratings/reviews (the backend has none);
  // we show the honest facts instead: today's status, doctors, and seats.
  const Card = (v) => {
    const Glyph = GLYPHS[v.glyph] || Building;
    return (
      <div key={v.id} className={styles.card} role="button" tabIndex={0} onClick={() => open(v.id)}>
        <span className={`${styles.art} ${styles[v.g]}`}>
          <Glyph size={54} className={styles.glyph} />
          <span className={styles.badge}>{STATUS_LABEL[v.status] || 'Closed'}</span>
          <button
            className={`${styles.fav} ${favs[v.id] ? styles.on : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleFav(v.id); }}
            aria-label="Save"
          >
            <Heart size={19} fill={favs[v.id] ? 'currentColor' : 'none'} />
          </button>
        </span>
        <div className={styles.cardBody}>
          <div className={styles.cardRow}>
            <h3 className={styles.cardName}>{v.name}</h3>
          </div>
          <p className={styles.sub}>{v.cat} · {v.area}</p>
          <p className={styles.sub}>
            {v.doctorsCount} doctor{v.doctorsCount === 1 ? '' : 's'}
            {v.status === 'active' ? ` · ${v.seats} seat${v.seats === 1 ? '' : 's'} today` : ''}
          </p>
        </div>
      </div>
    );
  };

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <button className={styles.loc} onClick={() => router.push('/location-picker')}>
          <MapPin size={18} className={styles.pin} /> <span className={styles.locText}>{locLabel}</span>
          <ChevronDown size={18} className={styles.chev} />
        </button>
        <button className={styles.bell} aria-label="Notifications" onClick={() => router.push('/alerts')}>
          <Bell size={20} />{unread > 0 && <span className={styles.dot} />}
        </button>
      </div>

      {offline && <div className={styles.offline}>Offline · showing saved info</div>}

      <div className={styles.searchWrap}>
        <div className={styles.search} role="search">
          <Search size={20} className={styles.mag} />
          <input placeholder="Browse clinics & treatments" aria-label="Search" onFocus={() => router.push('/explore')} readOnly />
          <button className={styles.searchBtn} onClick={() => router.push('/explore')}>Search</button>
        </div>
      </div>

      <div className={styles.cats}>
        {CATEGORIES.map(({ Icon, label }, i) => (
          <button key={label} className={`${styles.cat} ${i === 0 ? styles.on : ''}`} onClick={() => router.push('/explore')}>
            <span className={styles.tile}><Icon size={24} /></span>
            <span className={styles.catLabel}>{label}</span>
          </button>
        ))}
      </div>

      <section className={styles.sec}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Clinics for you</h2>
          <button className={styles.seeAll} onClick={() => router.push('/explore')}>See all</button>
        </div>
        {loading ? (
          <p className={styles.sub} style={{ padding: '0 20px' }}>Loading clinics…</p>
        ) : error ? (
          <p className={styles.sub} style={{ padding: '0 20px', color: '#c0392b' }}>{error}</p>
        ) : featured.length === 0 ? (
          <p className={styles.sub} style={{ padding: '0 20px' }}>No clinics available yet.</p>
        ) : (
          <div className={styles.rail}>{featured.map(Card)}</div>
        )}
      </section>

      {more.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>More clinics</h2>
            <button className={styles.seeAll} onClick={() => router.push('/explore')}>See all</button>
          </div>
          {more.map((v) => {
            const Glyph = GLYPHS[v.glyph] || Building;
            return (
              <div key={v.id} className={styles.wide} role="button" tabIndex={0} onClick={() => open(v.id)}>
                <span className={`${styles.wideArt} ${styles[v.g]}`}><Glyph size={30} /></span>
                <div className={styles.wideBody}>
                  <h3 className={styles.wideName}>{v.name}</h3>
                  <p className={styles.wideSub}>{v.cat} · {v.area}</p>
                </div>
                <button
                  className={`${styles.wideFav} ${favs[v.id] ? styles.on : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleFav(v.id); }}
                  aria-label="Save"
                >
                  <Heart size={20} fill={favs[v.id] ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
        </section>
      )}

      <nav className={styles.tabbar} aria-label="Primary">
        <button className={`${styles.tab} ${styles.active}`}>
          <Home size={22} /> Home
        </button>
        <button className={styles.tab} onClick={() => router.push('/explore')}>
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
