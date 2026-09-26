'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import {
  ArrowLeft, TrendingUp, Calendar, Clock, ChevronDown, Plus,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import styles from './earnings.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const rupee = (n) => '₹' + Number(Math.abs(n)).toLocaleString('en-IN');

// local transaction glyphs
const InArrow = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 7 7 17M7 9v8h8" />
  </svg>
);
const OutArrow = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M17 15V7H9" />
  </svg>
);
const Bank = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10 12 4l9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8" /><path d="M3 21h18" />
  </svg>
);

const STAT_C = { Credited: 'green', Completed: 'green', Processing: 'blue', Debited: 'red' };
const KIND = { credit: { Ico: InArrow, c: 'green' }, withdraw: { Ico: Bank, c: 'blue' }, refund: { Ico: OutArrow, c: 'red' } };

const TX = [
  { id: 't1', kind: 'credit', title: 'Consultation Fee', who: 'Rahul Verma', date: 'Today, 10:30 AM', amt: 500, status: 'Credited' },
  { id: 't2', kind: 'withdraw', title: 'Withdrawal to Bank', who: 'HDFC ••4821', date: 'Today, 09:10 AM', amt: -5000, status: 'Processing' },
  { id: 't3', kind: 'credit', title: 'Consultation Fee', who: 'Priya Singh', date: 'Today, 09:30 AM', amt: 800, status: 'Credited' },
  { id: 't4', kind: 'refund', title: 'Refund Issued', who: 'Amit Kumar', date: '25 Sep, 04:15 PM', amt: -300, status: 'Debited' },
  { id: 't5', kind: 'credit', title: 'Consultation Fee', who: 'Sneha Gupta', date: '25 Sep, 11:00 AM', amt: 600, status: 'Credited' },
  { id: 't6', kind: 'credit', title: 'Consultation Fee', who: 'Vikash Yadav', date: '24 Sep, 05:40 PM', amt: 450, status: 'Credited' },
];
const WD = [
  { id: 'w1', kind: 'withdraw', title: 'Bank Transfer', who: 'HDFC ••4821', date: '25 Sep, 09:10 AM', amt: -5000, status: 'Processing' },
  { id: 'w2', kind: 'withdraw', title: 'Bank Transfer', who: 'HDFC ••4821', date: '20 Sep, 02:30 PM', amt: -8000, status: 'Completed' },
  { id: 'w3', kind: 'withdraw', title: 'Bank Transfer', who: 'HDFC ••4821', date: '12 Sep, 10:00 AM', amt: -6500, status: 'Completed' },
];

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

export default function Wallet() {
  const router = useRouter();
  const [tab, setTab] = useState('tx');
  const list = tab === 'tx' ? TX : WD;

  return (
    <main className={`${styles.root} ${poppins.className}`}>
      <header className={styles.top}>
        <button className={styles.back} onClick={() => { tapLight(); router.back(); }} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className={styles.title}>Wallet</h1>
          <p className={styles.sub}>Manage your earnings and withdrawals</p>
        </div>
      </header>

      <div className={styles.scroll}>
        <section className={styles.balance}>
          <div className={styles.balMid}>
            <span className={styles.balLbl}>Available Balance</span>
            <span className={styles.balVal}>{rupee(12450)}</span>
            <span className={styles.balSub}>Total Earnings: <b>{rupee(28320)}</b></span>
          </div>
          <WalletArt />
        </section>

        <div className={styles.actions}>
          <button className={styles.redeem} onClick={() => { tapLight(); router.push('/earnings/settlements'); }}>
            <Bank size={17} />Redeem to Bank
          </button>
          <button className={styles.addBtn} onClick={() => tapLight()}>
            <Plus size={17} />Add Money
          </button>
        </div>

        <section className={styles.statRow}>
          <div className={styles.statCol}>
            <span className={styles.statV}>{rupee(8240)}</span>
            <span className={styles.statL}>This Month</span>
            <span className={styles.statUp}><TrendingUp size={12} />+12%</span>
          </div>
          <div className={styles.statCol}>
            <span className={styles.statV}>46</span>
            <span className={styles.statL}>Appointments</span>
            <span className={styles.statMeta}><Calendar size={12} />Total</span>
          </div>
          <div className={styles.statCol}>
            <span className={styles.statV}>{rupee(3500)}</span>
            <span className={styles.statL}>Pending Payout</span>
            <span className={styles.statProc}><Clock size={12} />Processing</span>
          </div>
        </section>

        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'tx' ? styles.tabOn : ''}`} onClick={() => { tapLight(); setTab('tx'); }}>Transaction History</button>
          <button className={`${styles.tabBtn} ${tab === 'wd' ? styles.tabOn : ''}`} onClick={() => { tapLight(); setTab('wd'); }}>Withdrawal History</button>
        </div>

        <button className={styles.dropdown}><Calendar size={15} />All Transactions<ChevronDown size={15} /></button>

        <h2 className={styles.recentH}>Recent Transactions</h2>
        <div className={styles.list}>
          {list.map((t) => {
            const k = KIND[t.kind];
            return (
              <div key={t.id} className={styles.txRow}>
                <span className={`${styles.txIc} ${styles['k_' + k.c]}`}><k.Ico size={18} /></span>
                <span className={styles.txMid}>
                  <span className={styles.txTitle}>{t.title}</span>
                  <span className={styles.txSub}>{t.who} · {t.date}</span>
                </span>
                <span className={styles.txEnd}>
                  <span className={`${styles.txAmt} ${t.amt < 0 ? styles.amtNeg : styles.amtPos}`}>
                    {t.amt < 0 ? '-' : '+'}{rupee(t.amt)}
                  </span>
                  <span className={`${styles.txPill} ${styles['p_' + STAT_C[t.status]]}`}>{t.status}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ height: 8 }} />
      </div>

      <div className={styles.footer}>
        <button className={styles.redeemBig} onClick={() => { tapLight(); router.push('/earnings/settlements'); }}>
          <Bank size={18} />Redeem to Bank Account
        </button>
      </div>
    </main>
  );
}
