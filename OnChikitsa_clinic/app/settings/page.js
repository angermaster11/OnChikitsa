'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Poppins } from 'next/font/google';
import {
  ArrowLeft, ChevronRight, ChevronDown, Bell, Clock, Stethoscope,
  Image, ClipboardList, UserPlus, Users, Calendar, Settings, Check,
} from '../_components/icons';
import { tapLight, notify } from '../_lib/haptic';
import { clinicApi } from '../_lib/api';
import styles from './settings.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

// storefront glyph the shared set doesn't carry
const Store = (p) => (
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l1.5-4.5A2 2 0 0 1 6.4 3h11.2a2 2 0 0 1 1.9 1.5L21 9" />
    <path d="M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9" />
    <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" /><path d="M9 20v-5h6v5" />
  </svg>
);

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
      { Ico: ClipboardList, t: 'Clinic Details', d: 'Name, address & contact information', r: '/profile' },
      { Ico: Clock, t: 'Working Hours', d: 'Set your clinic timings', r: '/schedule' },
      { Ico: Stethoscope, t: 'Services', d: 'Manage consultation types & charges', r: '/services' },
      { Ico: Image, t: 'Photos', d: 'Add clinic photos & gallery', r: '/setup/photos' },
    ],
  },
  {
    h: 'Doctors & Staff', s: 'Manage your medical team and their access',
    rows: [
      { Ico: UserPlus, t: 'Add Doctors', d: 'Add doctors to your clinic', r: '/doctors/add' },
      { Ico: Users, t: 'Manage Staff', d: 'Receptionists & assistants', r: '/doctors' },
      { Ico: Calendar, t: 'Consultation Availability', d: 'Set doctor availability & slots', r: '/schedule/slots' },
    ],
  },
  {
    h: 'Notifications', s: 'Choose what alerts you and your patients receive',
    rows: [{ Ico: Bell, t: 'Notification Settings', d: 'Manage alerts & reminders', r: '/setup/notifications' }],
  },
  {
    h: 'Other Settings', s: 'App preferences and general options',
    rows: [{ Ico: Settings, t: 'App Preferences', d: 'Language, theme & more', r: '/more' }],
  },
];

export default function ClinicSettings() {
  const router = useRouter();
  const go = (r) => () => { tapLight(); router.push(r); };
  const [status, setStatus] = useState('Active');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    try {
      await clinicApi.updateMe({ status: STATUS[next].server });
      notify('SUCCESS');
    } catch {
      setStatus(prev);
      notify('ERROR');
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className={`${styles.root} ${poppins.className}`}>
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

        <p className={styles.ver}>OnChikitsa Clinic · v1.0.0</p>
      </div>
    </main>
  );
}
