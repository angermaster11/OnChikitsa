'use client';

import { useState } from 'react';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import EmptyState from '../_components/EmptyState';
import { Calendar, UserPlus, IndianRupee, X, Clock, Wallet, Info, Bell } from '../_components/icons';
import { NOTIFICATIONS } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

const DANGER_IC = { background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)' };
const TYPE = {
  appointment: { Icon: Calendar, cls: '' },
  arrived: { Icon: UserPlus, cls: '' },
  payment: { Icon: IndianRupee, cls: 'accent' },
  cancel: { Icon: X, cls: '', style: DANGER_IC },
  reschedule: { Icon: Clock, cls: '' },
  settlement: { Icon: Wallet, cls: 'accent' },
  system: { Icon: Info, cls: '' },
};

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS);
  const unread = items.filter((n) => n.unread).length;

  const markAll = () => { tapLight(); setItems((xs) => xs.map((n) => ({ ...n, unread: false }))); };
  const markRead = (id) => { tapLight(); setItems((xs) => xs.map((n) => (n.id === id ? { ...n, unread: false } : n))); };

  return (
    <Screen>
      <TopBar
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'All caught up'}
        right={
          <button className="link" onClick={markAll} disabled={!unread} style={{ opacity: unread ? 1 : 0.45, minHeight: 44 }}>
            Mark all read
          </button>
        }
      />
      <div className="content">
        {items.length === 0 ? (
          <EmptyState icon={<Bell size={30} />} title="You're all caught up" hint="New appointments, payments and updates will show here." />
        ) : (
          <div className="list" style={{ paddingTop: 10 }}>
            {items.map((n) => {
              const t = TYPE[n.type] || TYPE.system;
              const { Icon } = t;
              return (
                <button
                  key={n.id}
                  className="list-row"
                  onClick={() => markRead(n.id)}
                  aria-label={`${n.title}${n.unread ? ', unread' : ''}`}
                  style={n.unread ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary-tint) 55%, var(--card))' } : undefined}
                >
                  <div className={`thumb-ic ${t.cls}`} style={t.style}><Icon size={20} /></div>
                  <div className="lr-main">
                    <div className="lr-title">
                      {n.title}
                      {n.unread && <span className="badge-dot" style={{ color: 'var(--primary)' }} />}
                    </div>
                    <div className="lr-sub" style={{ display: 'block', marginTop: 3 }}>{n.body}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--faint-fg)', marginTop: 5 }}>{n.time}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </Screen>
  );
}
