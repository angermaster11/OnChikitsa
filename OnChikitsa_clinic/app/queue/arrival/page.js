'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import { CheckCircle, ArrowRight } from '../../_components/icons';
import { findAppt } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

// Patient arrival / check-in. Reads ?id= client-side (static-export safe).
export default function ArrivalPage() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);

  const appt = findAppt(id);

  const markArrived = () => { tapLight(); setArrived(true); };
  const backToQueue = () => { tapLight(); router.push('/queue'); };

  return (
    <Screen>
      <TopBar title="Patient arrival" subtitle={appt.id} />
      <div className="content">
        <div className="pad" style={{ paddingTop: 8 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar name={appt.patient} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{appt.patient}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3 }}>{appt.service}</div>
              </div>
              <StatusPill status={appt.status} />
            </div>
            <div className="breakdown">
              <div className="br"><span className="lbl">Appointment</span><span className="val">{appt.id}</span></div>
              <div className="br"><span className="lbl">Time</span><span className="val">{appt.time}</span></div>
              <div className="br"><span className="lbl">Doctor</span><span className="val">{appt.doctor}</span></div>
              <div className="br"><span className="lbl">Payment</span><span className="val"><StatusPill status={appt.pay} /></span></div>
            </div>
          </div>

          {arrived ? (
            <div className="card" style={{ marginTop: 14, padding: 20, textAlign: 'center' }}>
              <div style={{ color: 'var(--accent-strong)', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                <CheckCircle size={18} /> Patient marked arrived
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', margin: '12px 0 8px' }}>Assigned token</div>
              <span className="token-chip" style={{ display: 'inline-block', padding: '14px 28px' }}>
                <span className="k">TOKEN</span>
                <span className="v" style={{ fontSize: 40 }}>{appt.token}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 8, paddingBottom: 'calc(16px + var(--sab))' }}>
        {arrived ? (
          <button className="btn btn-outline btn-block" onClick={backToQueue} aria-label="Back to queue">
            Back to queue <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn btn-primary btn-block" onClick={markArrived} aria-label="Mark patient arrived">
            <CheckCircle size={19} /> Mark Arrived
          </button>
        )}
      </div>
    </Screen>
  );
}
