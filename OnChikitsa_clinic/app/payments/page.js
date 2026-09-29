'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import Sheet from '../_components/Sheet';
import Segmented from '../_components/Segmented';
import StatusPill from '../_components/StatusPill';
import EmptyState from '../_components/EmptyState';
import {
  Filter, CreditCard, ChevronRight, IndianRupee, CheckCircle, Clock,
} from '../_components/icons';
import { earningsApi, ApiError } from '../_lib/api';
import { tapLight } from '../_lib/haptic';

const rupeeP = (paise) => '₹' + (Number(paise || 0) / 100)
  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Backend PAYMENT_STATUS → StatusPill props (label + coloured key from data.js).
const PILL = {
  PAID: { status: 'paid' },
  REFUNDED: { status: 'refunded' },
  FAILED: { status: 'cancelled', label: 'Failed' },
  CREATED: { status: 'pending', label: 'Awaiting payment' },
};
// UI filter label → backend status (undefined = all).
const FILTERS = { All: undefined, Paid: 'PAID', Refunded: 'REFUNDED', Pending: 'CREATED', Failed: 'FAILED' };

// A "YYYY-…"/ISO timestamp → "23 Sep · 10:32 AM".
function stamp(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

export default function Payments() {
  const router = useRouter();
  const go = (r) => { tapLight(); router.push(r); };

  const [open, setOpen] = useState(false);
  const [fStatus, setFStatus] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await earningsApi.listPayments({ status: FILTERS[fStatus], limit: 100 });
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, [fStatus]);

  useEffect(() => { load(); }, [load]);

  // Headline figures for the visible set (the clinic's 90% share, split by settlement).
  const paid = items.filter((p) => p.status === 'PAID');
  const sharePaise = paid.reduce((s, p) => s + (p.breakdown?.clinicAmountPaise || 0), 0);
  const settledPaise = paid
    .filter((p) => p.settlement?.status === 'PAID')
    .reduce((s, p) => s + (p.breakdown?.clinicAmountPaise || 0), 0);
  const pendingPaise = sharePaise - settledPaise;

  const stats = [
    { k: 'Your share', v: rupeeP(sharePaise), Icon: IndianRupee, cls: 'accent' },
    { k: 'Settled', v: rupeeP(settledPaise), Icon: CheckCircle, cls: '' },
    { k: 'Pending', v: rupeeP(pendingPaise), Icon: Clock, cls: pendingPaise ? 'warn' : '' },
  ];

  return (
    <Screen>
      <TopBar
        title="Payments"
        right={(
          <button className="icon-btn" aria-label="Filter payments" onClick={() => { tapLight(); setOpen(true); }}>
            <Filter size={20} />
          </button>
        )}
      />
      <div className="content">
        <section className="section">
          <div className="section-head">
            <h2>{fStatus === 'All' ? 'All payments' : `${fStatus} payments`}</h2>
            {!loading && <span style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>{items.length} total</span>}
          </div>
        </section>

        <div className="stat-grid g3">
          {stats.map(({ k, v, Icon, cls }) => (
            <div key={k} className={`stat ${cls}`}>
              <div className="st-ic"><Icon size={19} /></div>
              <div className="st-v money">{v}</div>
              <div className="st-l">{k}</div>
            </div>
          ))}
        </div>

        <section className="section">
          <div className="section-head">
            <h2>Recent payments</h2>
            <button className="link" onClick={() => { tapLight(); setOpen(true); }}>Filter</button>
          </div>
        </section>

        {err ? (
          <EmptyState
            icon={<IndianRupee size={30} />}
            title="Couldn’t load payments"
            hint={err}
            action={<button className="btn btn-outline" onClick={() => { tapLight(); load(); }}>Try again</button>}
          />
        ) : loading ? (
          <p className="pad" style={{ color: 'var(--muted-fg)', fontSize: 13.5 }}>Loading payments…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IndianRupee size={30} />}
            title="No payments yet"
            hint="Payments from booked appointments will appear here once patients pay."
          />
        ) : (
          <div className="list">
            {items.map((p) => {
              // For a paid booking the clinic cares about settlement of its share;
              // for other states the payment status itself is what matters.
              const settled = p.settlement?.status === 'PAID';
              const pill = p.status === 'PAID'
                ? { status: settled ? 'paid' : 'pending', label: settled ? 'Settled' : 'Pending settlement' }
                : (PILL[p.status] || { status: 'pending', label: p.status });
              return (
                <button key={p._id} className="list-row" onClick={() => go(`/payments/detail?id=${p._id}`)}>
                  <div className="thumb-ic accent"><CreditCard size={20} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{p.contact?.name || 'Patient'}</div>
                    <div className="lr-sub">{stamp(p.createdAt)}</div>
                  </div>
                  <div className="lr-end">
                    <div className="lr-price money">{rupeeP(p.breakdown?.clinicAmountPaise ?? p.amountPaise)}</div>
                    <StatusPill status={pill.status} label={pill.label} />
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
                </button>
              );
            })}
          </div>
        )}
        <div style={{ height: 14 }} />
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Filter payments">
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Status</div>
            <Segmented
              options={Object.keys(FILTERS)}
              value={fStatus}
              onChange={(v) => { setFStatus(v); }}
            />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { tapLight(); setOpen(false); }}>
            Apply filter
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
