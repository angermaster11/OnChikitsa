'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import EmptyState from '../../_components/EmptyState';
import {
  Clock, Calendar, Ticket, Phone, User, FileText,
  Check, Play, CheckCircle, Ban,
} from '../../_components/icons';
import { tapLight, notify } from '../../_lib/haptic';
import { appointmentApi } from '../../_lib/api';

const orDash = (v) => (v == null || String(v).trim() === '' ? '—' : v);

// Backend status → label + global badge class.
const STATUS = {
  BOOKED:     { label: 'Booked',     badge: 'badge-muted' },
  ARRIVED:    { label: 'Arrived',    badge: 'badge-info' },
  CONSULTING: { label: 'Consulting', badge: 'badge-warning' },
  COMPLETED:  { label: 'Completed',  badge: 'badge-success' },
  CANCELLED:  { label: 'Cancelled',  badge: 'badge-danger' },
  NO_SHOW:    { label: 'No-show',    badge: 'badge-danger' },
};

// The one forward step available from each live status.
const PRIMARY = {
  BOOKED:     { label: 'Mark arrived',          Icon: CheckCircle, next: 'ARRIVED' },
  ARRIVED:    { label: 'Start consultation',    Icon: Play,        next: 'CONSULTING' },
  CONSULTING: { label: 'Complete consultation', Icon: Check,       next: 'COMPLETED', accent: true },
};

const TERMINAL = { COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'marked as a no-show' };

/** "HH:MM" (24h) → "H:MM AM/PM". */
function to12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
/** "YYYY-MM-DD" → "Sat, 27 Sep 2026" (parsed locally, never UTC-shifted). */
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
export default function AppointmentDetail() {
  const router = useRouter();
  const go = (r) => { tapLight(); router.push(r); };
  const [id, setId] = useState(null);
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    setId(qid);
    if (!qid) { setError('Appointment not found.'); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const data = await appointmentApi.get(qid);
        if (alive) { setAppt(data || null); if (!data) setError('This appointment no longer exists.'); }
      } catch (e) {
        if (alive) setError(e?.message || 'Could not load this appointment.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function apply(next) {
    if (!id || busy) return;
    setBusy(true); tapLight();
    try {
      const updated = await appointmentApi.updateStatus(id, next);
      setAppt(updated);
      setConfirmCancel(false);
      notify('SUCCESS');
    } catch (e) {
      setError(e?.message || 'Could not update the appointment.');
      notify('ERROR');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <TopBar title="Appointment" />
        <div className="content">
          <p style={{ padding: '28px 4px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>Loading…</p>
        </div>
      </Screen>
    );
  }
  if (!appt) {
    return (
      <Screen>
        <TopBar title="Appointment" />
        <div className="content">
          <EmptyState
            icon={<Calendar size={30} />}
            title="Appointment not found"
            hint={error}
            action={<button className="btn btn-outline" onClick={() => go('/appointments')}>Back to appointments</button>}
          />
        </div>
      </Screen>
    );
  }
  const p = appt.patient || {};
  const meta = STATUS[appt.status] || { label: appt.status, badge: 'badge-muted' };
  const primary = PRIMARY[appt.status];
  const canDropOut = appt.status === 'BOOKED' || appt.status === 'ARRIVED';
  const slot = [to12(appt.slotStart), to12(appt.slotEnd)].filter(Boolean).join(' – ');
  const terminalNote = TERMINAL[appt.status];

  const rows = [
    { Icon: Calendar, k: 'Date', v: orDash(fmtDate(appt.date)) },
    { Icon: Clock, k: 'Time', v: orDash(slot) },
    { Icon: Ticket, k: 'Token', v: `#${appt.tokenNo}` },
    { Icon: User, k: 'Age', v: orDash(p.age ? `${p.age} yrs` : '') },
    { Icon: User, k: 'Gender', v: orDash(titleCase(p.gender)) },
    { Icon: FileText, k: 'Reason', v: orDash(appt.reason) },
  ];

  return (
    <Screen>
      <TopBar title="Appointment" subtitle={`Token #${appt.tokenNo}`} />
      <div className="content">
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} size={56} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{orDash(p.name)}</h2>
                {p.phone && (
                  <a href={`tel:${p.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted-fg)', fontSize: 13.5, marginTop: 3 }}>
                    <Phone size={13} /> {p.phone}
                  </a>
                )}
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge ${meta.badge}`}><span className="badge-dot" />{meta.label}</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted-fg)', fontSize: 13 }}>
                <Clock size={14} /> {orDash(slot)}
              </span>
            </div>
          </div>
        </div>

        <section className="section"><div className="section-head"><h2>Details</h2></div></section>
        <div className="pad">
          <div className="card" style={{ padding: '4px 16px' }}>
            <div className="breakdown">
              {rows.map(({ Icon, k, v }) => (
                <div className="br" key={k}>
                  <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={16} /> {k}</span>
                  <span className="val" style={{ maxWidth: '58%', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {primary && (
            <button
              className={`btn ${primary.accent ? 'btn-accent' : 'btn-primary'} btn-block`}
              disabled={busy}
              onClick={() => apply(primary.next)}
            >
              <primary.Icon size={20} /> {busy ? 'Working…' : primary.label}
            </button>
          )}

          {canDropOut && !confirmCancel && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} disabled={busy} onClick={() => apply('NO_SHOW')}>
                <Ban size={18} /> No-show
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 40%, var(--card))' }}
                disabled={busy}
                onClick={() => { tapLight(); setConfirmCancel(true); }}
              >
                <Ban size={18} /> Cancel
              </button>
            </div>
          )}

          {confirmCancel && (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ color: 'var(--muted-fg)', fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
                Cancel this appointment for {orDash(p.name)}? Their slot will be released.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} disabled={busy} onClick={() => setConfirmCancel(false)}>Keep</button>
                <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }} disabled={busy} onClick={() => apply('CANCELLED')}>
                  {busy ? 'Cancelling…' : 'Cancel appointment'}
                </button>
              </div>
            </div>
          )}

          {terminalNote && (
            <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--muted-fg)', fontSize: 13.5 }}>
              This appointment has been {terminalNote}.
            </div>
          )}

          {error && <p role="alert" style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </Screen>
  );
}
