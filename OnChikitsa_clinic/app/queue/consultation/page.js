'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import { CheckCircle, Clock } from '../../_components/icons';
import { findAppt, QUEUE } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Consultation status with a live-timer feel. Reads ?id= client-side.
export default function ConsultationPage() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [secs, setSecs] = useState(0);

  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t); // cleanup on unmount
  }, []);

  const appt = findAppt(id);
  const complete = () => { tapLight(); router.push('/queue'); };

  return (
    <Screen>
      <TopBar title="Consultation" subtitle={appt.id} />
      <div className="content">
        <div className="q-now" style={{ marginTop: 10 }}>
          <div className="q-cap">In consultation</div>
          <div className="q-tok">{appt.token}</div>
          <div className="q-name">{appt.patient}</div>
          <div className="q-timer"><Clock size={14} /> {mmss(secs)}</div>
        </div>

        <div className="pad" style={{ paddingTop: 8 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar name={appt.patient} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{appt.patient}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3 }}>{appt.doctor}</div>
              </div>
              <StatusPill status="consulting" />
            </div>
            <div className="breakdown">
              <div className="br"><span className="lbl">Service</span><span className="val">{appt.service}</span></div>
              <div className="br"><span className="lbl">Started</span><span className="val">{QUEUE.consulting.startedAt}</span></div>
              <div className="br"><span className="lbl">Elapsed</span><span className="val money">{mmss(secs)}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 8, paddingBottom: 'calc(16px + var(--sab))' }}>
        <button className="btn btn-accent btn-block" onClick={complete} aria-label="Complete consultation">
          <CheckCircle size={19} /> Complete Consultation
        </button>
      </div>
    </Screen>
  );
}
