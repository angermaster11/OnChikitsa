'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import Avatar from '../_components/Avatar';
import EmptyState from '../_components/EmptyState';
import { Plus, Search, Stethoscope, ChevronRight } from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import { doctorApi } from '../_lib/api';

// Map a backend doctor doc → the shape this list renders.
function toRow(d) {
  return {
    id: d._id || d.id,
    name: d.name || 'Doctor',
    spec: d.specialization || 'General',
    exp: Number.isFinite(d.experience) ? `${d.experience} yrs` : '',
    active: d.status !== 'INACTIVE',
    photo: d.photo || '',
  };
}

export default function Doctors() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const go = (r) => { tapLight(); router.push(r); };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await doctorApi.list();
        if (alive) setDocs(Array.isArray(list) ? list.map(toRow) : []);
      } catch (e) {
        if (alive) setError(e?.message || 'Could not load doctors.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const query = q.trim().toLowerCase();
  const list = query
    ? docs.filter((d) => `${d.name} ${d.spec}`.toLowerCase().includes(query))
    : docs;
  return (
    <Screen>
      <TopBar
        title="Doctors"
        subtitle={loading ? 'Loading…' : `${docs.length} in your clinic`}
        right={(
          <button className="icon-btn" aria-label="Add doctor" onClick={() => go('/doctors/add')}>
            <Plus size={20} />
          </button>
        )}
      />
      <div className="content">
        <div className="search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search doctors"
            placeholder="Search by name or specialization"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ padding: '28px 4px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>
            Loading doctors…
          </p>
        ) : error ? (
          <EmptyState
            icon={<Stethoscope size={30} />}
            title="Couldn’t load doctors"
            hint={error}
            action={<button className="btn btn-outline" onClick={() => { tapLight(); window.location.reload(); }}>Retry</button>}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Stethoscope size={30} />}
            title="No doctors found"
            hint={query ? `No doctor matches “${q.trim()}”.` : 'Add your first doctor to get started.'}
            action={(
              <button className="btn btn-primary" onClick={() => go('/doctors/add')}>
                <Plus size={18} /> Add doctor
              </button>
            )}
          />
        ) : (
          <div className="list">
            {list.map((d) => (
              <button
                key={d.id}
                className="list-row"
                onClick={() => go(`/doctors/detail?id=${d.id}`)}
              >
                <Avatar name={d.name} src={d.photo} size={46} status={d.active ? 'on' : 'off'} />
                <span className="lr-main">
                  <span className="lr-title">{d.name}</span>
                  <span className="lr-sub">{d.spec}{d.exp ? ` · ${d.exp}` : ''}</span>
                </span>
                <span className="lr-end">
                  <span className={`badge ${d.active ? 'badge-success' : 'badge-muted'}`}>
                    <span className="badge-dot" />
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </Screen>
  );
}
