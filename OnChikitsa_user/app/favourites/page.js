'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, AlertCircle,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { getCurrentUser } from '../_lib/auth';
import { flow } from '../_lib/flow';
import { favoriteApi, ApiError } from '../_lib/api';
import { mapClinicCard } from '../_lib/clinicMap';
import styles from './favourites.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
const STATUS_LABEL = { active: 'Active', booked: 'Fully booked', closed: 'Closed' };

export default function Favourites() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await favoriteApi.list();
      setClinics((data?.clinics || []).map(mapClinicCard));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your favourites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      await load();
    })();
    return () => { cancelled = true; };
  }, [router]);

  const open = (id) => { flow.setClinicId(id); router.push('/clinic'); };

  // Un-favourite removes the card immediately (optimistic); restore on failure.
  const remove = async (id) => {
    if (busyId) return;
    setBusyId(id);
    const prev = clinics;
    setClinics((list) => list.filter((c) => c.id !== id));
    try {
      await favoriteApi.remove(id);
    } catch {
      setClinics(prev);
    } finally {
      setBusyId('');
    }
  };

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <button className={styles.back} aria-label="Back" onClick={() => router.push('/profile')}><ArrowLeft size={22} /></button>
        <h1 className={styles.title}>Favourites</h1>
      </header>

      {loading ? (
        <p className={styles.loadTxt}>Loading your favourites…</p>
      ) : error ? (
        <Empty icon={<AlertCircle size={26} />} title="Couldn’t load favourites" sub={error} danger />
      ) : clinics.length === 0 ? (
        <Empty icon={<Heart size={26} />} title="No favourites yet" sub="Tap the heart on any clinic to save it here." />
      ) : (
        <div className={styles.list}>
          {clinics.map((v) => {
            const Glyph = GLYPHS[v.glyph] || Building;
            const img = v.logo || v.banner;
            return (
              <div key={v.id} className={styles.card} role="button" tabIndex={0} onClick={() => open(v.id)}>
                <span className={`${styles.art} ${styles[v.g]}`}>
                  {img ? <img className={styles.artImg} src={img} alt="" loading="lazy" /> : <Glyph size={28} />}
                </span>
                <div className={styles.body}>
                  <h2 className={styles.name}>{v.name}</h2>
                  <p className={styles.sub}>{v.cat} · {v.area}</p>
                  <p className={styles.sub}>
                    {v.doctorsCount} doctor{v.doctorsCount === 1 ? '' : 's'}
                    {v.status === 'active' ? ` · ${v.seats} seat${v.seats === 1 ? '' : 's'} today` : ` · ${STATUS_LABEL[v.status] || 'Closed'}`}
                  </p>
                </div>
                <button
                  className={`${styles.fav} ${styles.on}`}
                  disabled={busyId === v.id}
                  onClick={(e) => { e.stopPropagation(); remove(v.id); }}
                  aria-label="Remove from favourites"
                >
                  <Heart size={20} fill="currentColor" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Empty({ icon, title, sub, danger }) {
  return (
    <div className={styles.empty}>
      <span className={`${styles.emptyIcon} ${danger ? styles.emptyDanger : ''}`}>{icon}</span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySub}>{sub}</p>
    </div>
  );
}
