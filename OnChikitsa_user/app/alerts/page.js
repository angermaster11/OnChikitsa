'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Ticket, HeartPulse } from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { getNotifications } from '../_lib/notifications';
import { flow } from '../_lib/flow';
import styles from './alerts.module.css';

const ICONS = { reminder: Bell, booking: Ticket, health: HeartPulse };

export default function Alerts() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState([]);

  // Same fast auth gate + onboarding guard as the rest of the app. The list is
  // generated client-side (localStorage), so it's read after the mount check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setItems(getNotifications());
      setChecking(false);
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
  const openItem = (id) => {
    flow.markNotifsRead([id]);
    setItems((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)));
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
              <button key={n.id} className={`${styles.item} ${n.unread ? styles.unread : ''}`} onClick={() => openItem(n.id)}>
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
