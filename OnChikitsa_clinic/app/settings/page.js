'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronRight, ChevronDown, Stethoscope,
  ClipboardList, UserPlus, Users, Calendar, Check, Store, CreditCard, LogOut,
} from '../_components/icons';
import { tapLight, notify } from '../_lib/haptic';
import { clinicApi, invalidateMe } from '../_lib/api';
import { signOut } from '../_lib/auth';
import { flow } from '../_lib/flow';
import styles from './settings.module.css';

// UI status labels ↔ backend CLINIC_STATUS enum (ACTIVE / CLOSED / BOOKING_FULL).
const STATUS = {
  Active: { c: 'green', server: 'ACTIVE', sub: 'Your clinic is open and accepting appointments.' },
  'Fully booked': { c: 'amber', server: 'BOOKING_FULL', sub: 'Bookings are paused — your schedule is full for now.' },
  Closed: { c: 'red', server: 'CLOSED', sub: 'Your clinic is closed and not taking bookings.' },
};
const STATUS_ORDER = ['Active', 'Fully booked', 'Closed'];
const SERVER_TO_UI = { ACTIVE: 'Active', BOOKING_FULL: 'Fully booked', CLOSED: 'Closed' };
const GROUPS = [
  {
    h: 'Clinic Information', s: 'Update your clinic details and basic information',
    rows: [
      { Ico: ClipboardList, t: 'Clinic Details', d: 'Name, address, photos & contact info', r: '/profile' },
      { Ico: Stethoscope, t: 'Services', d: 'Specialities your clinic offers', r: '/services' },
    ],
  },
  {
    h: 'Doctors & Staff', s: 'Manage your medical team and their access',
    rows: [
      { Ico: UserPlus, t: 'Add Doctors', d: 'Add doctors to your clinic', r: '/doctors/add' },
      { Ico: Users, t: 'Manage Staff', d: 'Receptionists & assistants', r: '/doctors' },
      { Ico: Calendar, t: 'Slot Configuration', d: 'Set consultation slots & booking rules', r: '/schedule/slots' },
    ],
  },
  {
    h: 'Payments', s: 'Track what you earn',
    rows: [
      { Ico: CreditCard, t: 'Earnings & Settlements', d: 'Your 90% share and what the platform has settled', r: '/earnings' },
    ],
  },
  {
    h: 'Legal', s: 'Terms and policies',
    rows: [
      { Ico: ClipboardList, t: 'Privacy Policy', d: 'How we handle your data', r: '/legal/privacy' },
      { Ico: ClipboardList, t: 'Terms & Conditions', d: 'Your agreement with OnChikitsa', r: '/legal/terms' },
    ],
  },
];

export default function ClinicSettings() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };
  const [status, setStatus] = useState('Active');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusErr, setStatusErr] = useState('');
  const meta = STATUS[status];

  // Load the clinic's real status once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await clinicApi.getMe();
        if (alive && me && SERVER_TO_UI[me.status]) setStatus(SERVER_TO_UI[me.status]);
      } catch { /* keep the default until the clinic changes it */ }
    })();
    return () => { alive = false; };
  }, []);

  async function changeStatus(next) {
    tapLight();
    setOpen(false);
    if (next === status || saving) return;
    const prev = status;
    setStatus(next); // optimistic — revert if the PATCH fails
    setSaving(true);
    setStatusErr('');
    try {
      await clinicApi.updateMe({ status: STATUS[next].server });
      notify('SUCCESS');
    } catch {
      setStatus(prev);
      setStatusErr('Couldn’t update clinic status. Check your connection and try again.');
      notify('ERROR');
    } finally {
      setSaving(false);
    }
  }

  const logout = () => {
    if (saving) return;
    setSaving(true);
    tapLight();
    try { invalidateMe(); } catch {}
    try { flow.logout(); } catch {}
    try { signOut().catch(() => {}); } catch {}
    window.location.replace('/login');
  };

  return (
    <main className={styles.root}>
      <header className={styles.top}>
        <button className={styles.back} onClick={() => { tapLight(); router.back(); }} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className={styles.title}>Clinic Settings</h1>
          <p className={styles.sub}>Manage your clinic details and preferences</p>
        </div>
      </header>

      <div className={styles.scroll}>
        <section className={styles.statusCard}>
          <span className={styles.statusIc}><Store size={22} /></span>
          <div className={styles.statusMid}>
            <span className={styles.statusLbl}>Clinic Status</span>
            <span className={`${styles.statusVal} ${styles['c_' + meta.c]}`}>{status}</span>
            <span className={styles.statusSub}>{meta.sub}</span>
          </div>
          <div className={styles.ddWrap}>
            <button className={styles.dd} onClick={() => { tapLight(); setOpen((o) => !o); }} aria-expanded={open} disabled={saving}>
              <i className={`${styles.ddDot} ${styles['dot_' + meta.c]}`} />{saving ? 'Saving…' : status}<ChevronDown size={14} />
            </button>
            {open && (
              <div className={styles.ddMenu} role="menu">
                {STATUS_ORDER.map((s) => (
                  <button key={s} className={styles.ddItem} role="menuitem" onClick={() => changeStatus(s)}>
                    <i className={`${styles.ddDot} ${styles['dot_' + STATUS[s].c]}`} />
                    <span>{s}</span>
                    {s === status && <Check size={15} className={styles.ddCheck} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {statusErr && <p className={styles.statusErr} role="alert">{statusErr}</p>}

        {GROUPS.map((g) => (
          <section key={g.h} className={styles.group}>
            <div className={styles.groupHead}>
              <h2 className={styles.groupTitle}>{g.h}</h2>
              <p className={styles.groupSub}>{g.s}</p>
            </div>
            <div className={styles.card}>
              {g.rows.map(({ Ico, t, d, r }) => (
                <button key={t} className={styles.row} onClick={go(r)}>
                  <span className={styles.rowIc}><Ico size={19} /></span>
                  <span className={styles.rowMid}>
                    <span className={styles.rowT}>{t}</span>
                    <span className={styles.rowD}>{d}</span>
                  </span>
                  <ChevronRight size={18} className={styles.rowChev} />
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className={styles.group} style={{ marginTop: 24 }}>
          <div className={styles.card}>
            <button className={styles.row} onClick={logout} disabled={saving} style={{ color: 'var(--danger)' }}>
              <span className={styles.rowIc} style={{ color: 'var(--danger)' }}><LogOut size={19} /></span>
              <span className={styles.rowMid}>
                <span className={styles.rowT} style={{ color: 'var(--danger)' }}>{saving ? 'Logging out...' : 'Log out'}</span>
              </span>
            </button>
          </div>
        </section>

        <p className={styles.ver}>OnChikitsa Clinic · v1.0.0</p>
      </div>
    </main>
  );
}
