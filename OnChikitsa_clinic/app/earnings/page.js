'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, Clock, CheckCircle,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import { earningsApi, ApiError } from '../_lib/api';
import styles from './earnings.module.css';

const rupeeP = (paise) => '₹' + (Number(paise || 0) / 100)
  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Local bank glyph (icons.js has no Bank export).
const Bank = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10 12 4l9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8" /><path d="M3 21h18" />
  </svg>
);

function WalletArt() {
  return (
    <svg className={styles.walletArt} viewBox="0 0 120 110" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="98" rx="42" ry="8" fill="#068073" opacity="0.25" />
      <g><circle cx="30" cy="30" r="13" fill="#ffd76a" stroke="#f0b93a" strokeWidth="2" /><text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="800" fill="#c98a12">₹</text></g>
      <g><circle cx="92" cy="24" r="10" fill="#ffd76a" stroke="#f0b93a" strokeWidth="2" opacity="0.9" /><text x="92" y="28" textAnchor="middle" fontSize="10" fontWeight="800" fill="#c98a12">₹</text></g>
      <g transform="rotate(-6 60 66)">
        <rect x="24" y="42" width="72" height="50" rx="12" fill="#009a8a" />
        <rect x="24" y="42" width="72" height="50" rx="12" fill="url(#wg)" opacity="0.4" />
        <path d="M24 58h72" stroke="#00b3a1" strokeWidth="1.5" opacity="0.5" />
        <rect x="66" y="60" width="34" height="20" rx="7" fill="#ffffff" />
        <circle cx="83" cy="70" r="5.5" fill="#ffd76a" stroke="#f0b93a" strokeWidth="1.5" />
      </g>
      <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ee0cf" /><stop offset="1" stopColor="#009a8a" /></linearGradient></defs>
    </svg>
  );
}

export default function Earnings() {
  const router = useRouter();
  const [sum, setSum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      setSum(await earningsApi.getSummary());
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const earnedPaise = sum?.clinicPayablePaise || 0;
  const settledPaise = sum?.settledPaise || 0;
  const pendingPaise = sum?.pendingPaise || 0;
  const paidCount = sum?.paidCount || 0;
  // Settlement-state card: what the clinic is waiting on from the admin.
  const settle = pendingPaise > 0
    ? { c: 'blue', Ic: Clock, t: 'Pending settlement', badge: 'Pending', sub: `${rupeeP(pendingPaise)} awaiting settlement from the platform` }
    : earnedPaise > 0
      ? { c: 'green', Ic: CheckCircle, t: 'All settled', badge: 'Settled', sub: 'The platform has settled your full share' }
      : { c: 'blue', Ic: Bank, t: 'No earnings yet', badge: '—', sub: 'Your share appears here after your first paid booking' };

  return (
    <main className={styles.root}>
      <header className={styles.top}>
        <button className={styles.back} onClick={() => { tapLight(); router.back(); }} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className={styles.title}>Earnings</h1>
          <p className={styles.sub}>Your consultation share</p>
        </div>
      </header>

      <div className={styles.scroll}>
        {err ? (
          <div className={styles.txRow} style={{ display: 'block', textAlign: 'center', padding: 20 }}>
            <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13.5 }}>{err}</p>
            <button className="btn btn-outline" onClick={() => { tapLight(); load(); }}>Try again</button>
          </div>
        ) : loading ? (
          <p style={{ padding: '24px 4px', color: 'var(--muted)', fontSize: 13.5 }}>Loading earnings…</p>
        ) : (
          <>
            <section className={styles.balance}>
              <div className={styles.balMid}>
                <span className={styles.balLbl}>90% share earned</span>
                <span className={styles.balVal}>{rupeeP(earnedPaise)}</span>
                <span className={styles.balSub}>{paidCount} paid consultation{paidCount === 1 ? '' : 's'}</span>
              </div>
              <WalletArt />
            </section>

            <div
              className={styles.txRow}
              style={{ marginBottom: 16 }}
            >
              <span className={`${styles.txIc} ${styles['k_' + settle.c]}`}><settle.Ic size={18} /></span>
              <span className={styles.txMid}>
                <span className={styles.txTitle}>{settle.t}</span>
                <span className={styles.txSub} style={{ whiteSpace: 'normal' }}>{settle.sub}</span>
              </span>
              <span className={styles.txEnd}>
                <span className={`${styles.txPill} ${styles['p_' + settle.c]}`}>{settle.badge}</span>
              </span>
            </div>

            <section className={styles.statRow}>
              <div className={styles.statCol}>
                <span className={styles.statV}>{rupeeP(earnedPaise)}</span>
                <span className={styles.statL}>Earned</span>
                <span className={styles.statUp}><TrendingUp size={12} />90% share</span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statV}>{rupeeP(settledPaise)}</span>
                <span className={styles.statL}>Settled</span>
                <span className={styles.statMeta}><CheckCircle size={12} />By admin</span>
              </div>
              <div className={styles.statCol}>
                <span className={styles.statV}>{rupeeP(pendingPaise)}</span>
                <span className={styles.statL}>Pending</span>
                <span className={styles.statProc}><Clock size={12} />Awaiting</span>
              </div>
            </section>

            <h2 className={styles.recentH}>How settlement works</h2>
            <div className={styles.txRow} style={{ alignItems: 'flex-start' }}>
              <span className={`${styles.txIc} ${styles.k_green}`}><Bank size={18} /></span>
              <span className={styles.txMid}>
                <span className={styles.txTitle}>Settled by the platform</span>
                <span className={styles.txSub} style={{ whiteSpace: 'normal' }}>
                  The platform collects every consultation payment and keeps your 90% share safe.
                  It settles your pending balance to you directly and marks it settled here.
                </span>
              </span>
            </div>

            <button
              className="btn btn-outline btn-block"
              style={{ marginTop: 14 }}
              onClick={() => { tapLight(); router.push('/payments'); }}
            >
              View all payments
            </button>
          </>
        )}
      </div>
    </main>
  );
}
