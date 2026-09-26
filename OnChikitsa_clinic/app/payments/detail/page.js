'use client';

import { useState, useEffect } from 'react';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import StatusPill from '../../_components/StatusPill';
import { CreditCard, Wallet } from '../../_components/icons';
import { findPayment, rupee } from '../../_lib/data';

export default function PaymentDetail() {
  const [id, setId] = useState(null);
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  const p = findPayment(id);
  const methodLabel = p.method === 'online' ? 'Online' : 'Cash';
  const refundLabel = p.refund === 'full'
    ? 'Full refund issued'
    : p.refund === 'partial'
      ? 'Partial refund issued'
      : 'No refund';

  return (
    <Screen>
      <TopBar title="Payment details" subtitle={p.id} />
      <div className="content">
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div className={`thumb-ic ${p.method === 'online' ? 'accent' : ''}`}>
                {p.method === 'online' ? <CreditCard size={20} /> : <Wallet size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{p.patient}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3 }}>
                  {p.id} · Appointment {p.appt}
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>

            <div className="breakdown">
              <div className="br">
                <span className="lbl">Amount paid</span>
                <span className="val money">{rupee(p.amount)}</span>
              </div>
              <div className="br">
                <span className="lbl">Platform fee</span>
                <span className="val money">- {rupee(p.fee)}</span>
              </div>
              <div className="br">
                <span className="lbl">GST / taxes</span>
                <span className="val money">- {rupee(p.gst)}</span>
              </div>
              <div className="br total">
                <span className="lbl">Clinic net amount</span>
                <span className="val money">{rupee(p.net)}</span>
              </div>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="section-head"><h2>Transaction</h2></div>
        </section>
        <div className="pad">
          <div className="card" style={{ padding: 16 }}>
            <div className="breakdown" style={{ padding: 0 }}>
              <div className="br">
                <span className="lbl">Appointment</span>
                <span className="val">{p.appt}</span>
              </div>
              <div className="br">
                <span className="lbl">Method</span>
                <span className="val">{methodLabel}</span>
              </div>
              <div className="br">
                <span className="lbl">Date &amp; time</span>
                <span className="val">{p.date}</span>
              </div>
              <div className="br">
                <span className="lbl">Status</span>
                <span className="val"><StatusPill status={p.status} /></span>
              </div>
              <div className="br">
                <span className="lbl">Refund status</span>
                <span className="val">{refundLabel}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
