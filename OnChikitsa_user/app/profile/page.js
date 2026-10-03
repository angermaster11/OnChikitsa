'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, User, Heart, MessageCircle, Calendar,
  LifeBuoy, LogOut, Home, Compass, Ticket, Clipboard,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { flow } from '../_lib/flow';
import { signOut, getCurrentUser } from '../_lib/auth';
import { invalidateMe, userApi } from '../_lib/api';
import styles from './profile.module.css';

const MENU = [
  { key: 'profile', label: 'Profile', Icon: User },
  { key: 'favourites', label: 'Favourites', Icon: Heart },
  { key: 'messages', label: 'Messages', Icon: MessageCircle },
  { key: 'appointments', label: 'My appointments', Icon: Calendar },
];

// Every menu row navigates to a real screen.
const MENU_ROUTES = { profile: '/account', favourites: '/favourites', messages: '/messages', appointments: '/bookings' };

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checking, setChecking] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => { setProfile(flow.getProfile()); }, []);

  // Same guard as the dashboard, plus a fast local auth gate: only a
  // fully-onboarded user (resolveRoute → '/dashboard') may stay here; anyone
  // logged out is bounced to welcome before any account data renders, and the
  // header is refreshed from the DB profile that resolveRoute caches into flow.
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
        if (cancelled) return;
        if (route !== '/dashboard') { router.replace(route); return; }
        setProfile(flow.getProfile());
        // Fetch wallet balance (best-effort — if it fails the card just shows ₹0)
        try {
          const w = await userApi.getWallet();
          if (!cancelled) setWalletBalance(w.balanceRupees ?? 0);
        } catch { setWalletBalance(0); }
      } catch { /* network/server error → keep the cached view */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const fullName = profile ? [profile.first, profile.last].filter(Boolean).join(' ').trim() : '';
  const displayName = fullName || profile?.name || 'Your account';
  const initials =
    (fullName || profile?.name || 'U').split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0]).join('').toUpperCase() || 'U';
  const complete = !!(profile && profile.dob && profile.gender);

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await signOut(); } catch { /* best-effort; clear + leave regardless */ }
    invalidateMe();
    flow.signOut();
    router.replace('/welcome');
  };
  if (checking) return <main className={styles.screen} aria-busy="true" />;
  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.accType}>Personal account</p>
        </div>
        <span className={styles.avatar}>{initials}</span>
      </header>

      {/* ── Wallet Card ─────────────────────────────────────── */}
      <section className={styles.wallet}>
        <p className={styles.walletLabel}>My Wallet</p>
        <p className={styles.walletAmt}>
          ₹{walletBalance === null ? '—' : walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <button className={styles.walletBtn} onClick={() => router.push('/wallet')}>
          View transactions
        </button>
      </section>

      {!complete && (
        <section className={styles.promo}>
          <h2 className={styles.promoTitle}>Complete your profile</h2>
          <p className={styles.promoSub}>Add your health details so clinics can serve you better.</p>
          <button className={styles.promoBtn} onClick={() => router.push('/details')}>Add details</button>
        </section>
      )}

      <section className={styles.card}>
        {MENU.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={styles.row}
            onClick={() => router.push(MENU_ROUTES[key])}
          >
            <Icon size={22} className={styles.rowIcon} />
            <span className={styles.rowLabel}>{label}</span>
            <ChevronRight size={20} className={styles.rowChev} />
          </button>
        ))}
      </section>
      <section className={styles.card}>
        <button className={styles.row} onClick={() => router.push('/legal/privacy')}>
          <Clipboard size={22} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Privacy Policy</span>
          <ChevronRight size={20} className={styles.rowChev} />
        </button>
        <button className={styles.row} onClick={() => router.push('/legal/terms')}>
          <Clipboard size={22} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Terms & Conditions</span>
          <ChevronRight size={20} className={styles.rowChev} />
        </button>
      </section>

      <section className={styles.card}>
        <button className={styles.row} onClick={() => router.push('/support')}>
          <LifeBuoy size={22} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Support</span>
          <ChevronRight size={20} className={styles.rowChev} />
        </button>
      </section>

      <section className={styles.card}>
        <button className={styles.row} onClick={logout} disabled={signingOut}>
          <LogOut size={22} className={styles.rowIcon} />
          <span className={styles.rowLabel}>{signingOut ? 'Logging out…' : 'Log out'}</span>
          <ChevronRight size={20} className={styles.rowChev} />
        </button>
      </section>

      <nav className={styles.tabbar} aria-label="Primary">
        <button className={styles.tab} onClick={() => router.push('/dashboard')}>
          <Home size={22} /> Home
        </button>
        <button className={styles.tab} onClick={() => router.push('/explore')}>
          <Compass size={22} /> Explore
        </button>
        <button className={styles.tab} onClick={() => router.push('/bookings')}>
          <Ticket size={22} /> Bookings
        </button>
        <button className={`${styles.tab} ${styles.active}`}>
          <User size={22} /> Profile
        </button>
      </nav>
    </main>
  );
}
