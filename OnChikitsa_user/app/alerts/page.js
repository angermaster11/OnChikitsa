'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Ticket, HeartPulse } from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { buildNotifications } from '../_lib/notifications';
import { bookingApi } from '../_lib/api';
import { mapBooking } from '../_lib/clinicMap';
import { flow } from '../_lib/flow';
import styles from './alerts.module.css';

const ICONS = { reminder: Bell, booking: Ticket, health: HeartPulse };

export default function Alerts() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState([]);

  // Same fast auth gate + onboarding guard as the rest of the app. The list is
  // derived from the user's real bookings (reminders + "rate your visit").
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      try {
        const rows = await bookingApi.listMine('all');
        if (!cancelled) setItems(buildNotifications((rows || []).map(mapBooking)));
      } catch {
        if (!cancelled) setItems([]);
      }
      if (!cancelled) setChecking(false);
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on the notifications screen */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  const hasUnread = items.some((n) => n.unread);

  const markAll = () => {
    flow.markNotifsRead(items.map((n) => n.id));
    setItems((list) => list.map((n) => ({ ...n, unread: false })));
  };
  const openItem = (n) => {
    flow.markNotifsRead([n.id]);
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    // A booking update (e.g. "rate your visit") takes the user to their bookings.
    if (n.type === 'booking' || n.type === 'reminder') router.push('/bookings');
  };

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Notifications</h1>
        <button className={styles.readAll} onClick={markAll} disabled={!hasUnread}>Mark all read</button>
      </header>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Bell size={26} /></span>
          <p className={styles.emptyTitle}>No notifications</p>
          <p className={styles.emptySub}>Reminders and booking updates will show up here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} className={`${styles.item} ${n.unread ? styles.unread : ''}`} onClick={() => openItem(n)}>
                <span className={`${styles.ico} ${styles[n.tone]}`}><Icon size={20} /></span>
                <span className={styles.body}>
                  <span className={styles.row}>
                    {n.unread && <span className={styles.uDot} />}
                    <span className={styles.nTitle}>{n.title}</span>
                    <span className={styles.time}>{n.time}</span>
                  </span>
                  <span className={styles.nBody}>{n.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
