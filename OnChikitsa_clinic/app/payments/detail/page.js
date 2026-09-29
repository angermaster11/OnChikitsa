'use client';

import { useState, useEffect } from 'react';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import StatusPill from '../../_components/StatusPill';
import EmptyState from '../../_components/EmptyState';
import { CreditCard, IndianRupee } from '../../_components/icons';
import { earningsApi, ApiError } from '../../_lib/api';

const rupeeP = (paise) => '₹' + (Number(paise || 0) / 100)
  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Backend PAYMENT_STATUS → StatusPill props.
const PILL = {
  PAID: { status: 'paid' },
  REFUNDED: { status: 'refunded' },
  FAILED: { status: 'cancelled', label: 'Failed' },
  CREATED: { status: 'pending', label: 'Awaiting payment' },
};

function stamp(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

export default function PaymentDetail() {
  const [id, setId] = useState(null);
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        // No clinic-scoped per-payment endpoint — resolve the id from the recent list.
        const list = await earningsApi.listPayments({ limit: 100 });
        const found = Array.isArray(list) ? list.find((x) => String(x._id) === String(id)) : null;
        if (alive) setP(found || null);
      } catch (e) {
        if (alive) setErr(e instanceof ApiError ? e.message : 'Could not load this payment.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const b = p?.breakdown || {};
  const pill = p ? (PILL[p.status] || { status: 'pending', label: p.status }) : null;
  const settled = p?.settlement?.status === 'PAID';

  return (
    <Screen>
      <TopBar title="Payment details" subtitle={p ? (p.razorpayOrderId || p._id) : ''} />
      <div className="content">
        {err ? (
          <EmptyState icon={<IndianRupee size={30} />} title="Couldn’t load payment" hint={err} />
        ) : loading ? (
          <p className="pad" style={{ color: 'var(--muted-fg)', fontSize: 13.5 }}>Loading…</p>
        ) : !p ? (
          <EmptyState
            icon={<IndianRupee size={30} />}
            title="Payment not found"
            hint="This payment may be older than the recent list. Open it again from the Payments screen."
          />
        ) : (
          <>
            <div className="pad" style={{ paddingTop: 12 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div className="thumb-ic accent"><CreditCard size={20} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{p.contact?.name || 'Patient'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3 }}>
                      {stamp(p.paidAt || p.createdAt)}
                    </div>
                  </div>
                  <StatusPill status={pill.status} label={pill.label} />
                </div>

                <div className="breakdown">
                  <div className="br">
                    <span className="lbl">Consultation fee</span>
                    <span className="val money">{rupeeP(b.consultationFeePaise)}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">Platform commission{b.commissionPercent != null ? ` (${b.commissionPercent}%)` : ''}</span>
                    <span className="val money">- {rupeeP(b.commissionPaise)}</span>
                  </div>
                  <div className="br total">
                    <span className="lbl">Your net amount</span>
                    <span className="val money">{rupeeP(b.clinicAmountPaise)}</span>
                  </div>
                </div>
              </div>
            </div>

            {p.status === 'PAID' && (
              <>
                <section className="section"><div className="section-head"><h2>Settlement</h2></div></section>
                <div className="pad">
                  <div className="card" style={{ padding: 16 }}>
                    <div className="breakdown" style={{ padding: 0 }}>
                      <div className="br">
                        <span className="lbl">Your 90% share</span>
                        <span className="val money">{rupeeP(b.clinicAmountPaise)}</span>
                      </div>
                      <div className="br">
                        <span className="lbl">Status</span>
                        <span className="val">
                          <StatusPill
                            status={settled ? 'paid' : 'pending'}
                            label={settled ? 'Settled' : 'Pending settlement'}
                          />
                        </span>
                      </div>
                      {settled && p.settlement?.settledAt && (
                        <div className="br">
                          <span className="lbl">Settled on</span>
                          <span className="val">{stamp(p.settlement.settledAt)}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: '10px 2px 0', fontSize: 12, color: 'var(--muted-fg)', lineHeight: 1.5 }}>
                      {settled
                        ? 'The platform has settled this amount to you.'
                        : 'The platform is holding this amount and will settle it to you.'}
                    </p>
                  </div>
                </div>
              </>
            )}

            <section className="section"><div className="section-head"><h2>What the patient paid</h2></div></section>
            <div className="pad">
              <div className="card" style={{ padding: 16 }}>
                <div className="breakdown" style={{ padding: 0 }}>
                  <div className="br">
                    <span className="lbl">Consultation fee</span>
                    <span className="val money">{rupeeP(b.consultationFeePaise)}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">Platform fee</span>
                    <span className="val money">{rupeeP(b.platformFeePaise)}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">GST{b.gstRate != null ? ` (${b.gstRate}%)` : ''}</span>
                    <span className="val money">{rupeeP(b.gstPaise)}</span>
                  </div>
                  <div className="br total">
                    <span className="lbl">Total paid</span>
                    <span className="val money">{rupeeP(p.amountPaise ?? b.totalPaise)}</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="section"><div className="section-head"><h2>Transaction</h2></div></section>
            <div className="pad">
              <div className="card" style={{ padding: 16 }}>
                <div className="breakdown" style={{ padding: 0 }}>
                  <div className="br">
                    <span className="lbl">Order ID</span>
                    <span className="val" style={{ wordBreak: 'break-all', textAlign: 'right' }}>{p.razorpayOrderId || '—'}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">Razorpay payment ID</span>
                    <span className="val" style={{ wordBreak: 'break-all', textAlign: 'right' }}>{p.razorpayPaymentId || '—'}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">Date &amp; time</span>
                    <span className="val">{stamp(p.paidAt || p.createdAt)}</span>
                  </div>
                  <div className="br">
                    <span className="lbl">Status</span>
                    <span className="val"><StatusPill status={pill.status} label={pill.label} /></span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ height: 14 }} />
          </>
        )}
      </div>
    </Screen>
  );
}
