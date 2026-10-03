'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import BottomNav from '../_components/BottomNav';
import Avatar from '../_components/Avatar';
import {
  Users, Stethoscope, Calendar, CreditCard, TrendingUp, Star,
  Bell, Building, Settings, HelpCircle, ChevronRight, Check,
  Shield, FileText, LogOut,
} from '../_components/icons';
import { CLINIC, NOTIFICATIONS } from '../_lib/data';
import { tapLight } from '../_lib/haptic';
import { signOut } from '../_lib/auth';
import { invalidateMe } from '../_lib/api';
import { flow } from '../_lib/flow';

const LINKS = [
  { t: 'Patients', s: 'Patient records & history', Icon: Users, r: '/patients' },
  { t: 'Doctors', s: 'Team & specializations', Icon: Users, r: '/doctors' },
  { t: 'Services', s: 'Consultations & fees', Icon: Stethoscope, r: '/services' },
  { t: 'Schedule', s: 'Slots, holidays & leave', Icon: Calendar, r: '/schedule' },
  { t: 'Payments', s: 'Transactions & refunds', Icon: CreditCard, r: '/payments' },
  { t: 'Earnings', s: 'Revenue & settlements', Icon: TrendingUp, r: '/earnings' },
  { t: 'Reviews', s: 'Ratings & replies', Icon: Star, r: '/reviews' },
  { t: 'Notifications', s: 'Alerts & activity', Icon: Bell, r: '/notifications' },
  { t: 'Clinic Profile', s: 'Details shown to patients', Icon: Building, r: '/profile' },
  { t: 'Settings', s: 'Booking, payments & more', Icon: Settings, r: '/settings' },
  { t: 'Support', s: 'Help centre & tickets', Icon: HelpCircle, r: '/support' },
];

const LEGAL_LINKS = [
  { t: 'Privacy Policy', s: 'How we handle your data', Icon: Shield, r: '/legal/privacy' },
  { t: 'Terms & Conditions', s: 'Your agreement with OnChikitsa', Icon: FileText, r: '/legal/terms' },
];

export default function More() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const go = (r) => { tapLight(); router.push(r); };
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  function logout() {
    if (signingOut) return;
    setSigningOut(true);
    tapLight();
    // Clear all local state first, then navigate. Firebase signOut runs
    // in background — the hard page reload will kill any lingering session.
    try { invalidateMe(); } catch {}
    try { flow.logout(); } catch {}
    try { signOut().catch(() => {}); } catch {}
    // Hard reload — guarantees a fresh page load at /login.
    window.location.replace('/login');
  }

  return (
    <Screen>
      <div className="content with-tabbar">
        <header className="home-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Avatar name={CLINIC.name} size={46} square />
            <div style={{ minWidth: 0 }}>
              <h1 className="home-hi">{CLINIC.name}</h1>
              <div className="home-loc">
                {CLINIC.type}
                {CLINIC.verified ? (
                  <span className="badge badge-info" style={{ marginLeft: 6 }}>
                    <Check size={11} /> Verified
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="section">
          <div className="section-head"><h2>Manage</h2></div>
        </section>
        <nav className="list" aria-label="Clinic sections">
          {LINKS.map(({ t, s, Icon, r }) => (
            <button key={r} className="list-row" onClick={() => go(r)}>
              <span className="thumb-ic"><Icon size={20} /></span>
              <div className="lr-main">
                <div className="lr-title">{t}</div>
                <div className="lr-sub">{s}</div>
              </div>
              <div className="lr-end">
                {t === 'Notifications' && unread > 0 ? (
                  <span className="badge badge-danger">{unread}</span>
                ) : null}
                <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
              </div>
            </button>
          ))}
        </nav>

        {/* ── Legal ─────────────────────────────────────────────── */}
        <section className="section" style={{ marginTop: 8 }}>
          <div className="section-head"><h2>Legal</h2></div>
        </section>
        <nav className="list" aria-label="Legal">
          {LEGAL_LINKS.map(({ t, s, Icon, r }) => (
            <button key={r} className="list-row" onClick={() => go(r)}>
              <span className="thumb-ic"><Icon size={20} /></span>
              <div className="lr-main">
                <div className="lr-title">{t}</div>
                <div className="lr-sub">{s}</div>
              </div>
              <div className="lr-end">
                <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
              </div>
            </button>
          ))}
        </nav>

        {/* ── Logout ────────────────────────────────────────────── */}
        <nav className="list" style={{ marginTop: 8 }} aria-label="Account">
          <button
            className="list-row"
            onClick={logout}
            disabled={signingOut}
          >
            <span className="thumb-ic" style={{ color: '#dc2626', background: '#fef2f2' }}>
              <LogOut size={20} />
            </span>
            <div className="lr-main">
              <div className="lr-title" style={{ color: '#dc2626' }}>
                {signingOut ? 'Logging out…' : 'Log out'}
              </div>
            </div>
          </button>
        </nav>

        <div style={{ height: 14 }} />
      </div>
      <BottomNav active="more" />
    </Screen>
  );
}
