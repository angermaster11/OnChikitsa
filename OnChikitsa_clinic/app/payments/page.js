'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import Sheet from '../_components/Sheet';
import Segmented from '../_components/Segmented';
import StatusPill from '../_components/StatusPill';
import EmptyState from '../_components/EmptyState';
import {
  Filter, CreditCard, Wallet, Clock, RotateCcw, ChevronRight, IndianRupee,
} from '../_components/icons';
import { PAYMENTS, DOCTORS, rupee } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

const sum = (arr) => arr.reduce((s, p) => s + p.amount, 0);

export default function Payments() {
  const router = useRouter();
  const go = (r) => { tapLight(); router.push(r); };

  const [open, setOpen] = useState(false);
  const [fDate, setFDate] = useState('Today');
  const [fDoctor, setFDoctor] = useState('All');
  const [fMethod, setFMethod] = useState('All');
  const [fStatus, setFStatus] = useState('All');

  const online = sum(PAYMENTS.filter((p) => p.method === 'online' && p.status === 'success'));
  const cash = sum(PAYMENTS.filter((p) => p.method === 'cash' && p.status === 'success'));
  const pending = sum(PAYMENTS.filter((p) => p.status === 'pending'));
  const refunded = sum(PAYMENTS.filter((p) => p.status === 'refunded'));

  const stats = [
    { k: 'Online', v: rupee(online), Icon: CreditCard, cls: 'accent' },
    { k: 'Cash', v: rupee(cash), Icon: Wallet, cls: '' },
    { k: 'Pending', v: rupee(pending), Icon: Clock, cls: 'warn' },
    { k: 'Refunded', v: rupee(refunded), Icon: RotateCcw, cls: 'danger' },
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
            <h2>Today&apos;s revenue</h2>
            <span style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>Tue, 23 Sep</span>
          </div>
        </section>
        <div className="stat-grid">
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

        {PAYMENTS.length === 0 ? (
          <EmptyState
            icon={<IndianRupee size={30} />}
            title="No payments yet"
            hint="Payments from appointments will appear here once collected."
          />
        ) : (
          <div className="list">
            {PAYMENTS.map((p) => (
              <button key={p.id} className="list-row" onClick={() => go(`/payments/detail?id=${p.id}`)}>
                <div className={`thumb-ic ${p.method === 'online' ? 'accent' : ''}`}>
                  {p.method === 'online' ? <CreditCard size={20} /> : <Wallet size={20} />}
                </div>
                <div className="lr-main">
                  <div className="lr-title">{p.patient}</div>
                  <div className="lr-sub">{p.appt} · {p.method === 'online' ? 'Online' : 'Cash'} · {p.date}</div>
                </div>
                <div className="lr-end">
                  <div className="lr-price money">{rupee(p.amount)}</div>
                  <StatusPill status={p.status} />
                </div>
                <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 14 }} />
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Filter payments">
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Date</div>
            <Segmented options={['Today', 'This week', 'This month']} value={fDate} onChange={setFDate} />
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Doctor</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['All', ...DOCTORS.map((d) => d.name)].map((n) => (
                <button
                  key={n}
                  className={`chip ${fDoctor === n ? 'chip-accent' : 'chip-plain'}`}
                  style={{ border: 'none', cursor: 'pointer', minHeight: 44 }}
                  aria-pressed={fDoctor === n}
                  onClick={() => { tapLight(); setFDoctor(n); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Method</div>
            <Segmented options={['All', 'Online', 'Cash']} value={fMethod} onChange={setFMethod} />
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Status</div>
            <Segmented options={['All', 'Success', 'Pending', 'Refunded']} value={fStatus} onChange={setFStatus} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { tapLight(); setOpen(false); }}>
            Apply filters
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
