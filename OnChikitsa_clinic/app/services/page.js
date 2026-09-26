'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import Toggle from '../_components/Toggle';
import EmptyState from '../_components/EmptyState';
import { Plus, Search, Tag, Clock } from '../_components/icons';
import { SERVICES, rupee } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

export default function Services() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [state, setState] = useState(() => Object.fromEntries(SERVICES.map((s) => [s.id, s.active])));
  const go = (r) => { tapLight(); router.push(r); };
  const toggle = (id) => (v) => setState((m) => ({ ...m, [id]: v }));

  const query = q.trim().toLowerCase();
  const list = query ? SERVICES.filter((s) => s.name.toLowerCase().includes(query)) : SERVICES;

  return (
    <Screen>
      <TopBar
        title="Services"
        subtitle={`${SERVICES.length} services`}
        right={(
          <button className="icon-btn" aria-label="Add service" onClick={() => go('/services/edit')}>
            <Plus size={20} />
          </button>
        )}
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

        {list.length === 0 ? (
          <EmptyState
            icon={<Tag size={30} />}
            title="No services found"
            hint={query ? `No service matches “${q.trim()}”.` : 'Add a service to start accepting bookings.'}
            action={(
              <button className="btn btn-primary" onClick={() => go('/services/edit')}>
                <Plus size={18} /> Add service
              </button>
            )}
          />
        ) : (
          <div className="list">
            {list.map((s) => (
              <div key={s.id} className="list-row" style={{ cursor: 'default' }}>
                <button
                  type="button"
                  onClick={() => go(`/services/edit?id=${s.id}`)}
                  aria-label={`Edit ${s.name}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                >
                  <span className="thumb-ic accent"><Tag size={20} /></span>
                  <span className="lr-main">
                    <span className="lr-title">{s.name}</span>
                    <span className="lr-sub"><Clock size={13} /> {s.mins} min</span>
                  </span>
                </button>
                <span className="lr-end">
                  <span className="lr-price">{rupee(s.fee)}</span>
                  <Toggle on={state[s.id]} onChange={toggle(s.id)} label={`Toggle ${s.name}`} />
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
