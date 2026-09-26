'use client';

import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import StatusPill from '../../_components/StatusPill';
import EmptyState from '../../_components/EmptyState';
import { IndianRupee, Wallet } from '../../_components/icons';
import { SETTLEMENTS, rupee } from '../../_lib/data';

// Settlement status → an existing StatusPill key (+ label override), since
// 'settled' / 'processing' aren't in the shared STATUS map.
const pillFor = (status) => (status === 'settled'
  ? { status: 'success', label: 'Settled' }
  : { status: 'pending', label: 'Processing' });

export default function Settlements() {
  const settled = SETTLEMENTS.filter((s) => s.status === 'settled');
  const total = settled.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Screen>
      <TopBar title="Settlements" subtitle="Bank payouts" />
      <div className="content">
        <div className="stat-hero" style={{ marginTop: 10 }}>
          <div className="lbl">Total settled</div>
          <div className="val money">{rupee(total)}</div>
        </div>

        <section className="section">
          <div className="section-head"><h2>Payout history</h2></div>
        </section>

        {SETTLEMENTS.length === 0 ? (
          <EmptyState
            icon={<Wallet size={30} />}
            title="No settlements yet"
            hint="Once payments are settled to your bank account, they'll be listed here."
          />
        ) : (
          <div className="list">
            {SETTLEMENTS.map((s) => {
              const pill = pillFor(s.status);
              return (
                <div key={s.id} className="list-row" style={{ cursor: 'default' }}>
                  <div className="thumb-ic accent"><IndianRupee size={20} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{s.id}</div>
                    <div className="lr-sub">{s.date} · {s.count} payments</div>
                  </div>
                  <div className="lr-end">
                    <div className="lr-price money">{rupee(s.amount)}</div>
                    <StatusPill status={pill.status} label={pill.label} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
