'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '../_components/icons';
import { userApi } from '../_lib/api';

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [w, t] = await Promise.allSettled([
          userApi.getWallet(),
          userApi.getWalletTransactions(),
        ]);
        if (w.status === 'fulfilled') setBalance(w.value.balanceRupees ?? 0);
        else setBalance(0);
        if (t.status === 'fulfilled') {
          // API may return { items: [...] } or plain array
          const list = Array.isArray(t.value) ? t.value : (t.value?.items || t.value?.data || []);
          setTxns(list);
        }
      } catch { setBalance(0); }
      setLoading(false);
    })();
  }, []);

  const fmt = (n) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <main style={{ minHeight: '100dvh', background: '#f4f4f7', WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: 'calc(env(safe-area-inset-top) + 16px) 20px 16px',
      }}>
        <button
          onClick={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0e0e12', letterSpacing: '-0.02em' }}>My Wallet</h1>
      </header>

      {/* Balance Card */}
      <div style={{ margin: '4px 20px 0' }}>
        <div style={{
          borderRadius: 24, padding: '28px 24px',
          background: 'linear-gradient(115deg, #6a5cf0 0%, #8b5cf0 45%, #d94ff0 100%)',
          boxShadow: '0 14px 30px rgba(120, 80, 230, 0.28)',
          color: '#fff',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, opacity: 0.9 }}>Available Balance</p>
          <p style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {loading ? '—' : `₹${fmt(balance)}`}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.75 }}>Use wallet balance on your next booking</p>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ margin: '20px 20px 0', background: '#fff', borderRadius: 18, border: '1px solid #ececf0', boxShadow: '0 6px 18px rgba(20,20,45,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 10px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9a9aa4' }}>Transactions</p>
        </div>

        {loading ? (
          <div style={{ padding: '20px 18px', textAlign: 'center', color: '#9a9aa4' }}>
            <p style={{ margin: 0, fontSize: 14 }}>Loading...</p>
          </div>
        ) : txns.length === 0 ? (
          <div style={{ padding: '20px 18px', textAlign: 'center', color: '#9a9aa4' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No transactions yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Wallet credits and booking deductions will appear here</p>
          </div>
        ) : (
          txns.map((tx, i) => {
            const isCredit = tx.type === 'CREDIT';
            const amt = (tx.amountPaise || 0) / 100;
            return (
              <div key={tx._id || i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderTop: '1px solid #f1f1f4',
              }}>
                {/* Icon */}
                <span style={{
                  width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, flexShrink: 0,
                  background: isCredit ? '#ecfdf5' : '#fef2f2',
                  color: isCredit ? '#059669' : '#dc2626',
                }}>
                  {isCredit ? '+' : '−'}
                </span>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#16161a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description || (isCredit ? 'Wallet funded' : 'Booking payment')}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9a9aa4' }}>
                    {fmtDate(tx.createdAt)}
                  </p>
                </div>
                {/* Amount */}
                <span style={{
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                  color: isCredit ? '#059669' : '#dc2626',
                }}>
                  {isCredit ? '+' : '−'}₹{fmt(amt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div style={{ height: 40 }} />
    </main>
  );
}
