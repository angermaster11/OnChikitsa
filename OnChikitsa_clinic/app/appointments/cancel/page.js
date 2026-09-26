'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import { Clock, AlertCircle, Ban, Check } from '../../_components/icons';
import { findAppt, rupee } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const REASONS = [
  'Patient requested cancellation',
  'Doctor unavailable',
  'Scheduling conflict',
  'Duplicate booking',
  'Other',
];

export default function CancelAppointment() {
  const router = useRouter();
  const [id, setId] = useState(null);
  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);
  const a = findAppt(id);

  const [reason, setReason] = useState('');

  const paid = a.pay === 'paid';
  const refund = paid ? a.amount : 0;

  function confirm() {
    if (!reason) return;
    tapLight();
    router.push('/appointments');
  }

  return (
    <Screen>
      <TopBar title="Cancel appointment" subtitle={a.id} />
      <div className="content">
        <div className="section"><div className="section-head"><h2>Appointment</h2></div></div>
        <div style={{ padding: '0 22px' }}>
          <div className="appt-card">
            <div className="ac-top">
              <Avatar name={a.patient} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ac-name">{a.patient}</div>
                <div className="ac-sub">{a.doctor} · {a.service}</div>
              </div>
              <div className="token-chip"><span className="k">TOKEN</span><span className="v">{a.token}</span></div>
            </div>
            <div className="ac-meta">
              <span className="chip chip-plain"><Clock size={13} /> {a.date} · {a.time}</span>
              <StatusPill status={a.status} />
            </div>
          </div>
        </div>

        <div className="section"><div className="section-head"><h2>Reason for cancellation</h2></div></div>
        <div className="pad" role="radiogroup" aria-label="Cancellation reason" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REASONS.map((r) => {
            const on = reason === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { tapLight(); setReason(r); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  minHeight: 52, padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  background: 'var(--card)', color: 'var(--fg)', fontSize: 14, fontWeight: 600,
                  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 20, height: 20, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
                    border: `2px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                  }}
                >
                  {on ? <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--primary)' }} /> : null}
                </span>
                {r}
              </button>
            );
          })}
        </div>

        <div className="section"><div className="section-head"><h2>Refund</h2></div></div>
        <div className="card" style={{ margin: '0 22px', padding: '2px 16px' }}>
          <div className="breakdown">
            <div className="br"><span className="lbl">Amount paid</span><span className="val money">{rupee(paid ? a.amount : 0)}</span></div>
            <div className="br"><span className="lbl">Refund to patient</span><span className="val money">{rupee(refund)}</span></div>
            <div className="br total"><span className="lbl">Refund method</span><span className="val">{paid ? 'Original payment' : 'No payment collected'}</span></div>
          </div>
        </div>

        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--warning)', flex: 'none', marginTop: 1 }}><AlertCircle size={18} /></span>
            <p style={{ fontSize: 12.5, color: 'var(--muted-fg)', lineHeight: 1.5 }}>
              Cancellation policy: free cancellation up to 2 hours before the slot. Paid appointments are
              refunded to the original payment method within 5–7 business days. Late cancellations may not
              be eligible for a refund.
            </p>
          </div>
        </div>

        <div className="pad" style={{ padding: '16px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-block"
            style={{ background: 'var(--danger)', color: '#fff' }}
            disabled={!reason}
            onClick={confirm}
          >
            <Ban size={20} /> Confirm cancellation
          </button>
          <button className="btn btn-outline btn-block" onClick={() => { tapLight(); router.back(); }}>
            <Check size={18} /> Keep appointment
          </button>
        </div>
        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
