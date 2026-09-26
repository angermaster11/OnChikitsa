'use client';

import { useRouter } from 'next/navigation';
import { Home, Calendar, Ticket, Users, Grid } from './icons';
import { tapLight } from '../_lib/haptic';

// 5-tab bar shown only on tab-root screens. `active` is one of the keys below.
const TABS = [
  { key: 'home', label: 'Home', full: 'Home', route: '/dashboard', Icon: Home },
  { key: 'appointments', label: 'Appts', full: 'Appointments', route: '/appointments', Icon: Calendar },
  { key: 'queue', label: 'Queue', full: 'Queue', route: '/queue', Icon: Ticket },
  { key: 'patients', label: 'Patients', full: 'Patients', route: '/patients', Icon: Users },
  { key: 'more', label: 'More', full: 'More', route: '/more', Icon: Grid },
];

export default function BottomNav({ active }) {
  const router = useRouter();
  function go(route, key) {
    tapLight();
    if (key !== active) router.push(route);
  }
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(({ key, label, full, route, Icon }) => (
        <button
          key={key}
          className={`tab ${active === key ? 'active' : ''}`}
          aria-label={full}
          aria-current={active === key ? 'page' : undefined}
          onClick={() => go(route, key)}
        >
          <span className="tab-ic"><Icon size={22} /></span>
          {label}
        </button>
      ))}
    </nav>
  );
}
