'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Clock, MapPin, Phone, Mail, User, CheckCircle, Ticket, ChevronRight,
  Building, Stethoscope, Tooth, HeartPulse, Sparkles, Brain, Flask,
} from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { flow } from '../_lib/flow';
import { getClinic } from '../_lib/clinics';
import styles from './clinic.module.css';

const GLYPHS = { building: Building, stethoscope: Stethoscope, tooth: Tooth, heart: HeartPulse, sparkles: Sparkles, brain: Brain, flask: Flask };
const STATUS_LABEL = { active: 'Active', booked: 'Fully booked', closed: 'Closed' };
const STATUS_CLASS = { active: 'stActive', booked: 'stBooked', closed: 'stClosed' };
const GENDERS = [{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'other', label: 'Other' }];

export default function Clinic() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [clinic, setClinic] = useState(null);
  const [tab, setTab] = useState('booking');
  const [step, setStep] = useState('seats'); // seats → form → done
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [ref, setRef] = useState('');

  // Which clinic was tapped — id comes through flow (localStorage) so it survives
  // the static export / Capacitor file serving without query params.
  useEffect(() => {
    const c = getClinic(flow.getClinicId());
    if (!c) { router.replace('/explore'); return; }
    setClinic(c);
  }, [router]);

  // Same fast auth gate + onboarding guard as the rest of the app.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on the clinic screen */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (checking || !clinic) return <main className={styles.screen} aria-busy="true" />;

  const Glyph = GLYPHS[clinic.glyph] || Building;
  const bookable = clinic.status === 'active' && clinic.seats > 0;
  const canConfirm = name.trim().length >= 2 && String(age).trim() !== '' && phone.trim().length >= 6;

  // "Book for myself" — prefill the form from the saved profile / phone.
  const fillMyself = () => {
    const p = flow.getProfile() || {};
    const parts = flow.getPhoneParts();
    setName([p.first, p.last].filter(Boolean).join(' ').trim() || p.name || '');
    setGender(p.gender || '');
    if (parts?.number) setPhone(`${parts.dial} ${parts.number}`);
    if (p.dob) {
      const born = new Date(p.dob);
      if (!isNaN(born)) {
        const yrs = Math.floor((Date.now() - born.getTime()) / 31557600000);
        if (yrs > 0 && yrs < 130) setAge(String(yrs));
      }
    }
  };

  const confirm = () => {
    const r = 'OC' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const q = 10 + Math.floor(Math.random() * 18);                    // your token
    const cur = Math.max(1, q - (3 + Math.floor(Math.random() * 6)));  // now serving
    const now = Date.now();
    const fmt = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    flow.addBooking({
      id: r, ref: r, status: 'live',
      clinic: clinic.name, cat: clinic.cat, area: clinic.area, g: clinic.g, glyph: clinic.glyph,
      patient: name.trim() || 'You', date: 'Today',
      timing: fmt(now + 15 * 60000),
      expected: fmt(now + (q - cur) * 5 * 60000 + 15 * 60000),
      queueNo: q, currentNo: cur,
    });
    setRef(r);
    setStep('done');
  };

  return (
    <main className={styles.screen}>
      <div className={styles.banner}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <p className={styles.bannerTitle}>Clinic details</p>
      </div>

      <div className={styles.hero}>
        <span className={`${styles.logo} ${styles[clinic.g]}`}><Glyph size={30} /></span>
        <div className={styles.heroBody}>
          <h1 className={styles.name}>{clinic.name}</h1>
          <p className={styles.meta}>{clinic.cat} · {clinic.area}</p>
          <div className={styles.heroRow}>
            <span className={styles.rate}><Star size={13} /> {clinic.rate}</span>
            <span className={styles.reviews}>({clinic.reviews})</span>
            <span className={`${styles.badge} ${styles[STATUS_CLASS[clinic.status]]}`}>{STATUS_LABEL[clinic.status]}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        <button className={`${styles.tabBtn} ${tab === 'booking' ? styles.on : ''}`} onClick={() => setTab('booking')}>Booking</button>
        <button className={`${styles.tabBtn} ${tab === 'description' ? styles.on : ''}`} onClick={() => setTab('description')}>Description</button>
        <button className={`${styles.tabBtn} ${tab === 'contact' ? styles.on : ''}`} onClick={() => setTab('contact')}>Contact info</button>
      </div>

      {tab === 'booking' && step === 'seats' && (
        <div className={styles.pane}>
          <div className={styles.seatCard}>
            <div className={styles.seatTop}>
              <span className={styles.seatNum}>{clinic.seats}</span>
              <div className={styles.seatMeta}>
                <p className={styles.seatLabel}>{bookable ? 'Seats available today' : 'No seats available'}</p>
                <p className={styles.seatSub}>{bookable ? 'Book now to reserve your slot' : STATUS_LABEL[clinic.status]}</p>
              </div>
              <Ticket size={26} className={styles.seatIcon} />
            </div>
            <div className={styles.seatRow}><Clock size={18} /><span className={styles.rowLabel}>Timing</span> {clinic.hours}</div>
            <div className={styles.seatRow}><MapPin size={18} /><span className={styles.rowLabel}>Area</span> {clinic.area}</div>
          </div>
          {!bookable && <p className={styles.note}>This clinic isn’t taking bookings right now — try another from Explore.</p>}
          <button className={styles.cta} disabled={!bookable} onClick={() => setStep('form')}>Book appointment</button>
        </div>
      )}
      {tab === 'booking' && step === 'form' && (
        <div className={styles.pane}>
          <button className={styles.selfBtn} onClick={fillMyself}><User size={18} /> Book for myself</button>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Full name</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's full name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Age</label>
              <input className={styles.input} value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="Years" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gender</label>
              <div className={styles.chips}>
                {GENDERS.map((g) => (
                  <button key={g.key} className={`${styles.chip} ${gender === g.key ? styles.on : ''}`} onClick={() => setGender(g.key)}>{g.label}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone</label>
              <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 9xxxxxxxxx" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reason for visit (optional)</label>
              <textarea className={styles.textarea} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your concern" />
            </div>
          </div>
          <button className={styles.cta} disabled={!canConfirm} onClick={confirm}>Confirm booking</button>
        </div>
      )}
      {tab === 'booking' && step === 'done' && (
        <div className={styles.pane}>
          <div className={styles.done}>
            <span className={styles.doneIcon}><CheckCircle size={40} /></span>
            <h2 className={styles.doneTitle}>Booking confirmed</h2>
            <p className={styles.doneSub}>Your appointment at {clinic.name} is reserved.</p>
            <div className={styles.doneCard}>
              <div className={styles.doneRow}><span>Reference</span><b>{ref}</b></div>
              <div className={styles.doneRow}><span>Patient</span><b>{name}</b></div>
              <div className={styles.doneRow}><span>Clinic</span><b>{clinic.name}</b></div>
              <div className={styles.doneRow}><span>Timing</span><b>{clinic.hours}</b></div>
            </div>
            <button className={styles.cta} onClick={() => router.push('/explore')}>Back to Explore</button>
          </div>
        </div>
      )}
      {tab === 'description' && (
        <div className={styles.pane}>
          <p className={styles.about}>{clinic.about}</p>
          <div className={styles.infoList}>
            <div className={styles.infoRow}><Clock size={20} /><div><p className={styles.infoLabel}>Opening hours</p><p className={styles.infoVal}>{clinic.hours}</p></div></div>
            <div className={styles.infoRow}><Star size={20} /><div><p className={styles.infoLabel}>Rating</p><p className={styles.infoVal}>{clinic.rate} · {clinic.reviews} reviews</p></div></div>
            <div className={styles.infoRow}><MapPin size={20} /><div><p className={styles.infoLabel}>Location</p><p className={styles.infoVal}>{clinic.address}</p></div></div>
          </div>
        </div>
      )}

      {tab === 'contact' && (
        <div className={styles.pane}>
          <div className={styles.contact}>
            <a className={styles.cRow} href={`tel:${clinic.phone.replace(/\s/g, '')}`}>
              <span className={styles.cIcon}><Phone size={18} /></span>
              <div className={styles.cBody}><p className={styles.cLabel}>Phone</p><p className={styles.cVal}>{clinic.phone}</p></div>
              <ChevronRight size={20} className={styles.chev} />
            </a>
            <a className={styles.cRow} href={`mailto:${clinic.email}`}>
              <span className={styles.cIcon}><Mail size={18} /></span>
              <div className={styles.cBody}><p className={styles.cLabel}>Email</p><p className={styles.cVal}>{clinic.email}</p></div>
              <ChevronRight size={20} className={styles.chev} />
            </a>
            <div className={styles.cRow}>
              <span className={styles.cIcon}><MapPin size={18} /></span>
              <div className={styles.cBody}><p className={styles.cLabel}>Address</p><p className={styles.cVal}>{clinic.address}</p></div>
            </div>
            <div className={styles.cRow}>
              <span className={styles.cIcon}><Clock size={18} /></span>
              <div className={styles.cBody}><p className={styles.cLabel}>Hours</p><p className={styles.cVal}>{clinic.hours}</p></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
