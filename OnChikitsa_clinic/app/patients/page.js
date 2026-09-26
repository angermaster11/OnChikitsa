'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import BottomNav from '../_components/BottomNav';
import Avatar from '../_components/Avatar';
import EmptyState from '../_components/EmptyState';
import { Search, Users, ChevronRight, Phone, Clock } from '../_components/icons';
import { PATIENTS } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

// Patient database (tab root). Search filters by name/phone.
export default function PatientsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const list = PATIENTS.filter(
    (p) => p.name.toLowerCase().includes(query) || p.phone.toLowerCase().includes(query),
  );

  const open = (p) => { tapLight(); router.push(`/patients/detail?id=${p.id}`); };

  return (
    <Screen>
      <div className="content with-tabbar">
        <div className="page-title">
          <h1>Patients</h1>
          <p>{PATIENTS.length} registered</p>
        </div>

        <div className="search">
          <Search size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone"
            aria-label="Search patients"
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<Users size={26} />}
            title="No patients found"
            hint={`No results for “${q.trim()}”. Try another name or phone number.`}
          />
        ) : (
          <div className="list">
            {list.map((p) => (
              <button key={p.id} className="list-row" onClick={() => open(p)} aria-label={`Open ${p.name}`}>
                <Avatar name={p.name} size={46} />
                <div className="lr-main">
                  <div className="lr-title">{p.name}</div>
                  <div className="lr-sub"><Phone size={12} /> {p.phone}</div>
                  <div className="lr-sub"><Clock size={12} /> Last visit {p.lastVisit} · {p.visits} visits</div>
                </div>
                <div className="lr-end">
                  <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 14 }} />
      </div>
      <BottomNav active="patients" />
    </Screen>
  );
}
