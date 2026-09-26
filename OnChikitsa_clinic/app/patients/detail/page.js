'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import EmptyState from '../../_components/EmptyState';
import { Phone, Calendar, Clock, FileText, IndianRupee, ChevronRight } from '../../_components/icons';
import { findPatient, APPOINTMENTS, PAYMENTS, rupee } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

// Patient details. Reads ?id= client-side (static-export safe).
export default function PatientDetailPage() {
  const router = useRouter();
  const [id, setId] = useState(null);
  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);

  const p = findPatient(id);
  const history = APPOINTMENTS.filter((a) => a.patient === p.name);
  const pays = PAYMENTS.filter((py) => py.patient === p.name);
  const paidTotal = pays
    .filter((py) => py.status === 'success')
    .reduce((sum, py) => sum + py.amount, 0);
  const documents = []; // no documents in mock data

  const go = (r) => { tapLight(); router.push(r); };

  return (
    <Screen>
      <TopBar title="Patient" subtitle={p.name} />
      <div className="content">
        <div className="pad" style={{ paddingTop: 8 }}>
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 15 }}>
            <Avatar name={p.name} size={72} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{p.gender} · {p.age} yrs</div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} /> {p.phone}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-grid" style={{ paddingTop: 4 }}>
          <div className="stat">
            <div className="st-ic"><Calendar size={19} /></div>
            <div className="st-v">{p.visits}</div>
            <div className="st-l">Total visits</div>
          </div>
          <div className="stat accent">
            <div className="st-ic"><IndianRupee size={19} /></div>
            <div className="st-v money">{rupee(paidTotal)}</div>
            <div className="st-l">Total paid</div>
          </div>
        </div>

        <section className="section">
          <div className="section-head"><h2>Appointment history</h2></div>
        </section>
        {history.length === 0 ? (
          <EmptyState icon={<Calendar size={24} />} title="No appointments yet" hint="This patient has no appointment records." />
        ) : (
          <div className="list">
            {history.map((a) => (
              <button key={a.id} className="appt-card" style={{ width: '100%', textAlign: 'left' }} onClick={() => go(`/appointments/detail?id=${a.id}`)} aria-label={`Appointment ${a.id}, ${a.service}`}>
                <div className="ac-top">
                  <div className="token-chip"><span className="k">TOKEN</span><span className="v">{a.token}</span></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ac-name">{a.service}</div>
                    <div className="ac-sub">{a.doctor}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
                </div>
                <div className="ac-meta">
                  <span className="chip chip-plain"><Calendar size={13} /> {a.date}</span>
                  <span className="chip chip-plain"><Clock size={13} /> {a.time}</span>
                  <StatusPill status={a.status} />
                </div>
              </button>
            ))}
          </div>
        )}

        <section className="section">
          <div className="section-head"><h2>Payments</h2></div>
        </section>
        {pays.length === 0 ? (
          <EmptyState icon={<IndianRupee size={24} />} title="No payments" hint="No payment records for this patient." />
        ) : (
          <div className="list">
            {pays.map((py) => (
              <div key={py.id} className="list-row" style={{ cursor: 'default' }}>
                <div className="thumb-ic accent"><IndianRupee size={18} /></div>
                <div className="lr-main">
                  <div className="lr-title money">{rupee(py.amount)}</div>
                  <div className="lr-sub">{py.method} · {py.date}</div>
                </div>
                <div className="lr-end"><StatusPill status={py.status} /></div>
              </div>
            ))}
          </div>
        )}

        <section className="section">
          <div className="section-head"><h2>Documents</h2></div>
        </section>
        {documents.length === 0 ? (
          <EmptyState icon={<FileText size={24} />} title="No documents" hint="Prescriptions and reports will appear here." />
        ) : null}
        <div style={{ height: 20 }} />
      </div>
    </Screen>
  );
}
