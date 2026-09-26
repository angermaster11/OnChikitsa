'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, ChevronDown, Bell, Search, Heart, Star, Trophy, Home, Compass, Ticket, User,
  Grid, Stethoscope, Tooth, HeartPulse, Baby, Sparkles, Eye, Ear, Bone, Brain,
  Activity, Leaf, Flask, Pill, Syringe, Emergency, Building,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { flow } from '../_lib/flow';
import { unreadCount } from '../_lib/notifications';
import { getCurrentUser } from '../_lib/auth';
import styles from './dashboard.module.css';

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

const RECOMMENDED = [
  { id: 'r1', name: 'CityCare Multispeciality', rate: '4.9', dist: '2.1 km', area: 'Sector 18, Noida', cat: 'Multispeciality', reviews: '1,240', badge: 'Best in Class', trophy: true, g: 'g1', Glyph: Building },
  { id: 'r2', name: 'Dr. Aisha Rao', rate: '4.8', dist: '3.4 km', area: 'MG Road, Noida', cat: 'Cardiologist', reviews: '980', badge: 'Featured', g: 'g5', Glyph: HeartPulse },
  { id: 'r3', name: 'Sunrise Family Clinic', rate: '4.7', dist: '1.6 km', area: 'Park Street', cat: 'Family Medicine', reviews: '640', badge: 'Top Rated', g: 'g3', Glyph: Stethoscope },
];

const FRESH = [
  { id: 'n1', name: 'Aarogya Dental Studio', rate: '5.0', dist: '2.8 km', area: 'Sector 62, Noida', cat: 'Dental', reviews: '120', badge: 'New', g: 'g2', Glyph: Tooth },
  { id: 'n2', name: 'SkinGlow Dermatology', rate: '4.9', dist: '4.0 km', area: 'Golf Course Rd', cat: 'Dermatology', reviews: '85', badge: 'Deals', g: 'g4', Glyph: Sparkles },
  { id: 'n3', name: 'MindWell Clinic', rate: '4.8', dist: '3.2 km', area: 'Cyber Hub', cat: 'Psychiatry', reviews: '60', badge: 'New', g: 'g6', Glyph: Brain },
];

const NEARBY = [
  { id: 'v1', name: 'Wellness Point Polyclinic', dist: '1.1 km', area: 'Sector 15, Noida', g: 'g6', Glyph: Building },
  { id: 'v2', name: 'LifeLine Diagnostics', dist: '1.9 km', area: 'Atta Market, Noida', g: 'g3', Glyph: Flask },
];
export default function Dashboard() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [favs, setFavs] = useState({});
  const [locLabel, setLocLabel] = useState('Current location');
  const [unread, setUnread] = useState(0);
  const [checking, setChecking] = useState(true);

  // Reflect the location chosen on the picker (falls back to the generic label).
  useEffect(() => {
    const read = () => setLocLabel(flow.getLocation() || 'Current location');
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  // Keep the bell's unread dot honest — recompute on mount and whenever the user
  // returns to the dashboard (e.g. after reading them on the Notifications screen).
  useEffect(() => {
    const read = () => { try { setUnread(unreadCount()); } catch { setUnread(0); } };
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);

  // Central onboarding guard — bounce anyone who shouldn't be here. A fast local
  // auth check runs first so a logged-out user never sees the home screen (even
  // for a frame) before being sent to welcome.
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

  const Card = (v) => (
    <div key={v.id} className={styles.card} role="button" tabIndex={0}>
      <span className={`${styles.art} ${styles[v.g]}`}>
        <v.Glyph size={54} className={styles.glyph} />
        <span className={styles.badge}>{v.trophy && <Trophy size={13} />}{v.badge}</span>
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
          <span className={styles.rate}><Star size={13} /> {v.rate}</span>
        </div>
        <p className={styles.sub}>{v.dist} · {v.area}</p>
        <p className={styles.sub}>{v.cat} · {v.reviews} reviews</p>
      </div>
    </div>
  );
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
          <input placeholder="Browse clinics & treatments" aria-label="Search" />
          <button className={styles.searchBtn}>Search</button>
        </div>
      </div>

      <div className={styles.cats}>
        {CATEGORIES.map(({ Icon, label }, i) => (
          <button key={label} className={`${styles.cat} ${i === 0 ? styles.on : ''}`}>
            <span className={styles.tile}><Icon size={24} /></span>
            <span className={styles.catLabel}>{label}</span>
          </button>
        ))}
      </div>

      <section className={styles.sec}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Recommended</h2>
          <button className={styles.seeAll}>See all</button>
        </div>
        <div className={styles.rail}>{RECOMMENDED.map(Card)}</div>
      </section>

      <section className={styles.sec}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>New on OnChikitsa</h2>
          <button className={styles.seeAll}>See all</button>
        </div>
        <div className={styles.rail}>{FRESH.map(Card)}</div>
      </section>
      <section className={styles.sec}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Nearby venues</h2>
          <button className={styles.seeAll}>See all</button>
        </div>
        {NEARBY.map((v) => (
          <div key={v.id} className={styles.wide} role="button" tabIndex={0}>
            <span className={`${styles.wideArt} ${styles[v.g]}`}><v.Glyph size={30} /></span>
            <div className={styles.wideBody}>
              <h3 className={styles.wideName}>{v.name}</h3>
              <p className={styles.wideSub}>{v.dist} · {v.area}</p>
            </div>
            <button
              className={`${styles.wideFav} ${favs[v.id] ? styles.on : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(v.id); }}
              aria-label="Save"
            >
              <Heart size={20} fill={favs[v.id] ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))}
      </section>

      <nav className={styles.tabbar} aria-label="Primary">
        <button className={`${styles.tab} ${activeTab === 'home' ? styles.active : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={22} /> Home
        </button>
        <button className={styles.tab} onClick={() => router.push('/explore')}>
          <Compass size={22} /> Explore
        </button>
        <button className={styles.tab} onClick={() => router.push('/bookings')}>
          <Ticket size={22} /> Bookings
        </button>
        <button className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`} onClick={() => router.push('/profile')}>
          <User size={22} /> Profile
        </button>
      </nav>
    </main>
  );
}
