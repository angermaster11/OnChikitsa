'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import StatusPill from '../../_components/StatusPill';
import {
  Clock, Calendar, Stethoscope, Ticket, Phone, CreditCard,
  Check, Play, CheckCircle, Edit, Ban,
} from '../../_components/icons';
import { findAppt, rupee } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

export default function AppointmentDetail() {
  const router = useRouter();
  const go = (r) => { tapLight(); router.push(r); };
  const [id, setId] = useState(null);
  useEffect(() => { setId(new URLSearchParams(window.location.search).get('id')); }, []);

  const a = findAppt(id);
  const [status, setStatus] = useState(a.status);
  useEffect(() => { setStatus(a.status); }, [a.id]);

  const active = status !== 'completed' && status !== 'cancelled';
  const setLocal = (s) => { tapLight(); setStatus(s); };

  const primary = {
    pending: { label: 'Confirm appointment', Icon: Check, run: () => setLocal('confirmed') },
    confirmed: { label: 'Mark arrived', Icon: CheckCircle, run: () => setLocal('arrived') },
    arrived: { label: 'Start consultation', Icon: Play, run: () => go(`/queue/consultation?id=${a.id}`) },
    consulting: { label: 'Complete consultation', Icon: CheckCircle, accent: true, run: () => setLocal('completed') },
  }[status];

  const rows = [
    { Icon: Stethoscope, k: 'Doctor', v: a.doctor },
    { Icon: Calendar, k: 'Service', v: a.service },
    { Icon: Calendar, k: 'Date', v: a.date },
    { Icon: Clock, k: 'Time', v: a.time },
    { Icon: Ticket, k: 'Token', v: a.token },
  ];

  return (
    <Screen>
      <TopBar title="Appointment" subtitle={a.id} />
      <div className="content">
        <div style={{ padding: '6px 22px 2px' }}>
          <div className="appt-card">
            <div className="ac-top">
              <Avatar name={a.patient} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ac-name" style={{ fontSize: 16 }}>{a.patient}</div>
                <div className="ac-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} /> {a.phone}
                </div>
              </div>
              <div className="token-chip"><span className="k">TOKEN</span><span className="v">{a.token}</span></div>
            </div>
            <div className="ac-meta">
              <span className="chip chip-plain"><Clock size={13} /> {a.time}</span>
              <StatusPill status={status} />
              <span style={{ marginLeft: 'auto', fontWeight: 800 }} className="money">{rupee(a.amount)}</span>
            </div>
          </div>
        </div>

        <div className="section"><div className="section-head"><h2>Details</h2></div></div>
        <div className="card" style={{ margin: '0 22px', padding: '2px 16px' }}>
          <div className="breakdown">
            {rows.map(({ Icon, k, v }) => (
              <div className="br" key={k}>
                <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} /> {k}
                </span>
                <span className="val">{v}</span>
              </div>
            ))}
            <div className="br">
              <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={16} /> Payment
              </span>
              <span className="val"><StatusPill status={a.pay} /></span>
            </div>
            <div className="br">
              <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ticket size={16} /> Status
              </span>
              <span className="val"><StatusPill status={status} /></span>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {primary ? (
            <button className={`btn ${primary.accent ? 'btn-accent' : 'btn-primary'} btn-block`} onClick={primary.run}>
              <primary.Icon size={20} /> {primary.label}
            </button>
          ) : (
            <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--muted-fg)', fontSize: 13.5 }}>
              {status === 'completed'
                ? 'This appointment has been completed.'
                : 'This appointment was cancelled.'}
            </div>
          )}

          {active ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => go(`/appointments/reschedule?id=${a.id}`)}>
                <Edit size={18} /> Reschedule
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 40%, var(--card))' }}
                onClick={() => go(`/appointments/cancel?id=${a.id}`)}
              >
                <Ban size={18} /> Cancel
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ height: 14 }} />
      </div>
    </Screen>
  );
}
