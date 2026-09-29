'use client';

// Services now mirrors what the clinic picked during registration (its
// `specialties[]`), edited from the clinic profile. No fees are shown here — a
// clinic's default consultation fee lives on the profile / consultation step,
// not per-service.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import EmptyState from '../_components/EmptyState';
import { Search, Tag, Stethoscope } from '../_components/icons';
import { clinicApi } from '../_lib/api';
import { tapLight } from '../_lib/haptic';

export default function Services() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [specs, setSpecs] = useState(null); // null = loading, [] = loaded/empty
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await clinicApi.getMe();
        if (alive) setSpecs(Array.isArray(me?.specialties) ? me.specialties : []);
      } catch {
        if (alive) { setSpecs([]); setErr(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const query = q.trim().toLowerCase();
  const all = specs || [];
  const list = query ? all.filter((s) => s.toLowerCase().includes(query)) : all;

  return (
    <Screen>
      <TopBar
        title="Services"
        subtitle={specs === null ? 'Loading…' : `${all.length} ${all.length === 1 ? 'service' : 'services'}`}
      />
      <div className="content">
        <div className="search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search services"
            placeholder="Search services"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {specs === null ? (
          <div className="list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="list-row" style={{ cursor: 'default' }}>
                <span className="thumb-ic accent"><Stethoscope size={20} /></span>
                <span className="lr-main"><span className="lr-title" style={{ opacity: 0.35 }}>Loading…</span></span>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Tag size={30} />}
            title={query ? 'No services found' : err ? 'Couldn’t load services' : 'No services yet'}
            hint={query
              ? `No service matches “${q.trim()}”.`
              : err
                ? 'Check your connection and try again.'
                : 'The specialities you picked during registration show up here. Update them from your clinic profile.'}
            action={!query && !err ? (
              <button className="btn btn-primary" onClick={() => { tapLight(); router.push('/profile'); }}>
                Edit clinic profile
              </button>
            ) : null}
          />
        ) : (
          <div className="list">
            {list.map((name) => (
              <div key={name} className="list-row" style={{ cursor: 'default' }}>
                <span className="thumb-ic accent"><Stethoscope size={20} /></span>
                <span className="lr-main">
                  <span className="lr-title">{name}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </Screen>
  );
}
