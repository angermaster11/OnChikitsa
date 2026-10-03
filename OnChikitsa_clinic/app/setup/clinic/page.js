'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Building, Mail, Calendar, Clock, Camera, Image as ImageIcon,
  ChevronDown, Check, Stethoscope, Tooth, Baby, HeartPulse, MoreHorizontal, FileText,
  MapPin, Navigation, X,
} from '../../_components/icons';
import { flow } from '../../_lib/flow';
import { tapLight, notify } from '../../_lib/haptic';
import { clinicApi, uploadToCloudinary } from '../../_lib/api';
import { requestLocation } from '../../_lib/permissions';
import styles from './clinic.module.css';

const COUNTRIES = [
  { dial: '+91', flag: '🇮🇳', len: 10 },
  { dial: '+1', flag: '🇺🇸', len: 10 },
  { dial: '+44', flag: '🇬🇧', len: 10 },
  { dial: '+971', flag: '🇦🇪', len: 9 },
  { dial: '+61', flag: '🇦🇺', len: 9 },
];

// Labels shown to the clinic, each mapped to the numeric value the backend
// stores (yearsOld, and averageConsultationTime in minutes).
const YEARS = [
  { label: 'Less than 1 year', value: 0 },
  { label: '1–3 years', value: 2 },
  { label: '3–5 years', value: 4 },
  { label: '5–10 years', value: 7 },
  { label: 'More than 10 years', value: 12 },
];
const TIMES = [
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '20 minutes', value: 20 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
];
// Specialty toggles: local key → free-text label the backend stores in
// `specialties[]`. The glyph is purely decorative.
const Venus = (p) => <HeartPulse {...p} />;
const SPECIALTIES = [
  { key: 'gp', label: 'General Physician', Ico: Stethoscope },
  { key: 'dentist', label: 'Dental', Ico: Tooth },
  { key: 'pediatric', label: 'Pediatrics', Ico: Baby },
  { key: 'gyno', label: 'Gynecology', Ico: Venus },
  { key: 'cardio', label: 'Cardiology', Ico: HeartPulse },
  { key: 'ortho', label: 'Orthopedics', Ico: HeartPulse },
  { key: 'derma', label: 'Dermatology', Ico: HeartPulse },
  { key: 'other', label: 'Other', Ico: MoreHorizontal },
];

const TOTAL = 8;
// Per-step heading + subtitle (step 1 uses its own hero header).
const TITLES = {
  2: ['Add your email', 'For receipts, reports and important account updates.'],
  3: ['Where is your clinic?', 'Patients use this to find and reach you.'],
  4: ['How long has your clinic run?', 'Helps patients gauge your experience.'],
  5: ['Clinic specialization', 'Pick everything your clinic offers.'],
  6: ['About your clinic', 'A short intro patients will see on your profile.'],
  7: ['Add clinic images', 'A logo and banner make your profile look trustworthy.'],
  8: ['Consultation details', 'Your default fee and how long a visit usually takes.'],
};

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Shared phone control (country picker + national number).
function PhoneField({ ci, setCi, value, setValue, id, autoFocus }) {
  const [focus, setFocus] = useState(false);
  const c = COUNTRIES[ci];
  return (
    <div className={`${styles.phone} ${focus ? styles.focus : ''}`}>
      <label className={styles.cc} aria-label="Country code">
        <span className={styles.flag} aria-hidden="true">{c.flag}</span>
        <span>{c.dial}</span>
        <span className={styles.chev}><ChevronDown size={16} /></span>
        <select value={ci} onChange={(e) => setCi(Number(e.target.value))} aria-label="Select country code">
          {COUNTRIES.map((o, idx) => <option key={o.dial} value={idx}>{o.flag} {o.dial}</option>)}
        </select>
      </label>
      <span className={styles.sep} />
      <input
        id={id} className={styles.num} type="tel" inputMode="numeric" autoComplete="tel-national"
        placeholder="Phone number" value={value} maxLength={c.len + 4} autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, c.len))}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      />
    </div>
  );
}
export default function ClinicSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(null); // null | 'register' | 'logo' | 'banner'
  const [error, setError] = useState('');

  // Step 1 — name + up to two phones.
  const [clinicName, setClinicName] = useState('');
  const [ci1, setCi1] = useState(0);
  const [ph1, setPh1] = useState('');
  const [ci2, setCi2] = useState(0);
  const [ph2, setPh2] = useState('');

  // Step 2..8.
  const [email, setEmail] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy }
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState('');
  const [years, setYears] = useState('');
  const [specs, setSpecs] = useState(['gp']);
  const [about, setAbout] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPct, setLogoPct] = useState(0);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerPct, setBannerPct] = useState(0);
  const [fee, setFee] = useState('');
  const [avg, setAvg] = useState('');
  const [validity, setValidity] = useState('');

  const logoInput = useRef(null);
  const bannerInput = useRef(null);
  const stepRef = useRef(step);
  const busyRef = useRef(busy);
  stepRef.current = step;
  busyRef.current = busy;

  const c1 = COUNTRIES[ci1];

  // Hardware / browser back walks the wizard one step at a time; on step 1 it
  // falls through to the previous route. Frozen while we're submitting.
  useEffect(() => {
    window.history.pushState(null, '');
    const onPop = () => {
      if (busyRef.current) { window.history.pushState(null, ''); return; }
      if (stepRef.current > 1) {
        window.history.pushState(null, '');
        setStep((s) => Math.max(1, s - 1));
      } else {
        router.back();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);

  // Revoke the previous object URL when the picked image changes / on unmount.
  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);
  useEffect(() => () => { if (bannerUrl) URL.revokeObjectURL(bannerUrl); }, [bannerUrl]);
  function back() {
    if (busy) return;
    tapLight();
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  function toggleSpec(key) {
    tapLight();
    setSpecs((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function pickImage(kind, file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (kind === 'logo') { setLogoFile(file); setLogoUrl(url); setLogoPct(0); }
    else { setBannerFile(file); setBannerUrl(url); setBannerPct(0); }
  }

  function clearImage(kind) {
    tapLight();
    if (kind === 'logo') { setLogoFile(null); setLogoUrl(''); setLogoPct(0); if (logoInput.current) logoInput.current.value = ''; }
    else { setBannerFile(null); setBannerUrl(''); setBannerPct(0); if (bannerInput.current) bannerInput.current.value = ''; }
  }

  async function useCurrentLocation() {
    if (locating) return;
    setLocating(true);
    setLocErr('');
    tapLight();
    try {
      const res = await requestLocation();
      if (res.state === 'granted' && res.coords) {
        const { lat, lng, accuracy } = res.coords;
        setCoords({ lat, lng, accuracy });
        setLocated(true);
        // Best-effort reverse-geocode to auto-fill the address fields. If it
        // fails the coordinates are still captured and the clinic can type the
        // address by hand — never block on this.
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          );
          if (r.ok) {
            const g = await r.json();
            const loc = g.locality || g.city || '';
            const town = g.city || g.locality || '';
            const st = g.principalSubdivision || '';
            const pin = String(g.postcode || '').replace(/\D/g, '').slice(0, 6);
            if (loc) setLine((v) => v.trim() || loc);
            if (town) setCity(town);
            if (st) setStateName(st);
            if (pin) setPincode(pin);
          }
        } catch { /* keep coords; address stays manual */ }
      } else {
        setLocErr('Location permission was declined. You can type your address instead.');
      }
    } catch {
      setLocErr('Could not read your location. You can type your address instead.');
    } finally {
      setLocating(false);
    }
  }

  // Compose the optional backend address object from whatever the clinic typed.
  function buildAddress() {
    const a = {};
    if (line.trim()) a.line = line.trim();
    if (city.trim()) a.city = city.trim();
    if (stateName.trim()) a.state = stateName.trim();
    if (pincode.trim()) a.pincode = pincode.trim();
    const parts = [a.line, a.city, a.state, a.pincode].filter(Boolean);
    if (parts.length) a.formatted = parts.join(', ');
    return Object.keys(a).length ? a : undefined;
  }

  function stepValid(s) {
    switch (s) {
      case 1: return clinicName.trim().length > 1 && ph1.length === c1.len;
      case 2: return emailOk(email);
      case 3: return located || line.trim().length > 2;
      case 4: return !!years;
      case 5: return specs.length > 0;
      case 6: return true;
      case 7: return true;
      case 8: return Number(fee) > 0 && !!avg;
      default: return false;
    }
  }
  function next() {
    if (busy || !stepValid(step)) return;
    tapLight();
    setError('');
    if (step < TOTAL) {
      window.history.pushState(null, '');
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    setError('');
    setPhase('register');
    try {
      // ---- Build the register payload (only send what's provided). ----------
      const payload = { name: clinicName.trim(), phone1: `${c1.dial}${ph1}` };
      if (ph2) payload.phone2 = `${COUNTRIES[ci2].dial}${ph2}`;
      if (email.trim()) payload.email = email.trim();
      const yv = YEARS.find((y) => y.label === years);
      if (yv) payload.yearsOld = yv.value;
      if (about.trim()) payload.description = about.trim();
      const specLabels = specs
        .map((k) => SPECIALTIES.find((s) => s.key === k)?.label)
        .filter(Boolean);
      if (specLabels.length) payload.specialties = specLabels;
      const addr = buildAddress();
      if (addr) payload.address = addr;
      if (coords) payload.location = coords;
      if (Number(fee) > 0) payload.consultationFee = Number(fee);
      const tv = TIMES.find((t) => t.label === avg);
      if (tv) payload.averageConsultationTime = tv.value;
      if (Number(validity) >= 0 && validity !== '') payload.tokenValidityDays = Number(validity);

      await clinicApi.register(payload);

      // ---- Photos need the account to exist first (Cloudinary folder = clinic
      // id), so they upload AFTER register — best-effort: if uploads aren't
      // configured yet the clinic is still created and we move on. -------------
      const patch = {};
      if (logoFile) {
        setPhase('logo');
        try { patch.logo = await uploadToCloudinary(logoFile, 'logo', setLogoPct); } catch { /* skip */ }
      }
      if (bannerFile) {
        setPhase('banner');
        try { patch.banner = await uploadToCloudinary(bannerFile, 'banner', setBannerPct); } catch { /* skip */ }
      }
      if (patch.logo || patch.banner) {
        try { await clinicApi.updateMe(patch); } catch { /* non-fatal */ }
      }

      flow.setClinic({
        name: payload.name, phone1: payload.phone1, phone2: payload.phone2 || '',
        email: payload.email || '', specialties: specLabels,
        logo: patch.logo || '', banner: patch.banner || '',
      });
      flow.setClinicSetup();
      notify('SUCCESS');
      router.replace('/setup/notifications');
    } catch (err) {
      setPhase(null);
      setBusy(false);
      setError(err?.message || 'Could not create your clinic. Please try again.');
    }
  }

  const [t, sub] = TITLES[step] || [];
  const cta = step < TOTAL ? 'Next' : busy ? 'Please wait…' : 'Finish';
  const phaseText =
    phase === 'register' ? 'Creating your clinic…'
      : phase === 'logo' ? `Uploading logo… ${logoPct}%`
        : phase === 'banner' ? `Uploading banner… ${bannerPct}%`
          : '';
  const phasePct = phase === 'logo' ? logoPct : phase === 'banner' ? bannerPct : 0;
  return (
    <main className={styles.root}>
      <div className={styles.top}>
        <button className={styles.back} aria-label="Go back" onClick={back} disabled={busy}>
          <ArrowLeft size={22} />
        </button>
        <span className={styles.steplabel}>Step {step} of {TOTAL}</span>
      </div>
      <div className={styles.progress} aria-hidden="true">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span key={i} className={`${styles.seg} ${i < step ? styles.on : ''}`} />
        ))}
      </div>

      <div className={styles.body}>
        {step === 1 ? (
          <>
            <div className={styles.head}>
              <h1 className={styles.h1}>Set up your clinic</h1>
              <p className={styles.sub}>Tell patients who you are and how to reach you.</p>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="cname">Clinic name</label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><Building size={18} /></span>
                <input id="cname" className={styles.input} placeholder="e.g. Sunrise Multispeciality"
                  value={clinicName} onChange={(e) => setClinicName(e.target.value)} autoFocus />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="phone1">Primary phone</label>
              <PhoneField ci={ci1} setCi={setCi1} value={ph1} setValue={setPh1} id="phone1" />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="phone2">
                Secondary phone <span style={{ fontWeight: 500, color: '#9aa1ad' }}>(optional)</span>
              </label>
              <PhoneField ci={ci2} setCi={setCi2} value={ph2} setValue={setPh2} id="phone2" />
            </div>
          </>
        ) : (
          <div className={styles.head}>
            <h2 className={styles.title}>{t}</h2>
            <p className={styles.sub}>{sub}</p>
          </div>
        )}
        {step === 2 && (
          <div className={styles.group}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <div className={styles.inputwrap}>
              <span className={styles.lead}><Mail size={18} /></span>
              <input id="email" className={styles.input} type="email" inputMode="email" autoComplete="email"
                placeholder="clinic@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
          </div>
        )}
        {step === 3 && (
          <>
            <button type="button" onClick={useCurrentLocation} disabled={locating}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', minHeight: 48, borderRadius: 14, marginBottom: 14, cursor: 'pointer',
                fontSize: 14.5, fontWeight: 600, border: '1.5px solid',
                borderColor: located ? 'var(--primary)' : '#d7dee6',
                background: located ? 'var(--primary-tint)' : '#fff',
                color: located ? 'var(--primary-ink)' : '#1a1d29',
              }}>
              {located ? <Check size={18} /> : <Navigation size={18} />}
              {locating ? 'Getting location…' : located ? 'Current location captured' : 'Use current location'}
            </button>
            {locErr && (
              <p role="alert" style={{ margin: '-6px 2px 12px', fontSize: 13, fontWeight: 500, color: 'var(--danger)', lineHeight: 1.5 }}>
                {locErr}
              </p>
            )}
            <div className={styles.group}>
              <label className={styles.label} htmlFor="line">Address line</label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><MapPin size={18} /></span>
                <input id="line" className={styles.input} placeholder="Building, street, area"
                  value={line} onChange={(e) => setLine(e.target.value)} />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="city">City</label>
              <div className={styles.inputwrap}>
                <input id="city" className={styles.input} placeholder="City" style={{ paddingLeft: 16 }}
                  value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="state">State</label>
              <div className={styles.inputwrap}>
                <input id="state" className={styles.input} placeholder="State" style={{ paddingLeft: 16 }}
                  value={stateName} onChange={(e) => setStateName(e.target.value)} />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="pin">Pincode</label>
              <div className={styles.inputwrap}>
                <input id="pin" className={styles.input} inputMode="numeric" placeholder="6-digit pincode" style={{ paddingLeft: 16 }}
                  value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
            </div>
          </>
        )}
        {step === 4 && (
          <div className={styles.group}>
            <label className={styles.label} htmlFor="years">Years in operation</label>
            <div className={styles.selectwrap}>
              <select id="years" className={`${styles.select} ${!years ? styles.empty : ''}`}
                value={years} onChange={(e) => setYears(e.target.value)}>
                <option value="" disabled>Select a range</option>
                {YEARS.map((y) => <option key={y.label} value={y.label}>{y.label}</option>)}
              </select>
              <span className={styles.selchev}><ChevronDown size={18} /></span>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className={styles.grid}>
            {SPECIALTIES.map(({ key, label, Ico }) => {
              const on = specs.includes(key);
              return (
                <button type="button" key={key} onClick={() => toggleSpec(key)}
                  className={`${styles.spec} ${on ? styles.specOn : ''}`} aria-pressed={on}>
                  <span className={styles.specIco}><Ico size={20} /></span>
                  <span className={styles.specLabel}>{label}</span>
                  {on && <span className={styles.specCheck}><Check size={14} /></span>}
                </button>
              );
            })}
          </div>
        )}
        {step === 6 && (
          <div className={styles.group}>
            <label className={styles.label} htmlFor="about">About the clinic <span style={{ fontWeight: 500, color: '#9aa1ad' }}>(optional)</span></label>
            <div className={styles.taWrap}>
              <span className={styles.taLead}><FileText size={18} /></span>
              <textarea id="about" className={styles.textarea} rows={5} maxLength={600}
                placeholder="Share what makes your clinic special — services, facilities, timings…"
                value={about} onChange={(e) => setAbout(e.target.value)} />
            </div>
            <span className={styles.counter}>{about.length}/600</span>
          </div>
        )}
        {step === 7 && (
          <>
            <input ref={logoInput} type="file" accept="image/*" hidden
              onChange={(e) => pickImage('logo', e.target.files?.[0])} />
            <input ref={bannerInput} type="file" accept="image/*" hidden
              onChange={(e) => pickImage('banner', e.target.files?.[0])} />

            <div className={styles.upHead}>Clinic logo</div>
            <button type="button" className={`${styles.upTile} ${logoUrl ? styles.upOn : ''}`}
              onClick={() => { tapLight(); logoInput.current?.click(); }}
              style={logoUrl ? { backgroundImage: `url(${logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {logoUrl ? (
                <span role="button" tabIndex={0} aria-label="Remove logo"
                  onClick={(e) => { e.stopPropagation(); clearImage('logo'); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,25,0.55)', color: '#fff' }}>
                  <X size={16} />
                </span>
              ) : (
                <>
                  <span className={styles.upCircle}><Camera size={22} /></span>
                  <span className={styles.upText}>Add clinic logo</span>
                  <span className={styles.upHint}>Square image, min 200×200</span>
                </>
              )}
            </button>

            <div className={styles.upHead} style={{ marginTop: 18 }}>Cover banner</div>
            <button type="button" className={`${styles.upTile} ${styles.ratio} ${bannerUrl ? styles.upOn : ''}`}
              onClick={() => { tapLight(); bannerInput.current?.click(); }}
              style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {bannerUrl ? (
                <span role="button" tabIndex={0} aria-label="Remove banner"
                  onClick={(e) => { e.stopPropagation(); clearImage('banner'); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,25,0.55)', color: '#fff' }}>
                  <X size={16} />
                </span>
              ) : (
                <>
                  <span className={styles.upCircle}><ImageIcon size={22} /></span>
                  <span className={styles.upText}>Add cover banner</span>
                  <span className={styles.upHint}>Wide image, 16:9 looks best</span>
                </>
              )}
            </button>
            <p style={{ margin: '14px 2px 0', fontSize: 12.5, color: '#9aa1ad', lineHeight: 1.5 }}>
              Both are optional — you can add or change these anytime from settings.
            </p>
          </>
        )}
        {step === 8 && (
          <>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="fee">Consultation fee</label>
              <div className={styles.feeWrap}>
                <span className={styles.feePrefix}>₹</span>
                <input id="fee" className={styles.feeInput} inputMode="numeric" placeholder="500"
                  value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="avg">Average consultation time</label>
              <div className={styles.selectwrap}>
                <select id="avg" className={`${styles.select} ${!avg ? styles.empty : ''}`}
                  value={avg} onChange={(e) => setAvg(e.target.value)}>
                  <option value="" disabled>Select a duration</option>
                  {TIMES.map((tm) => <option key={tm.label} value={tm.label}>{tm.label}</option>)}
                </select>
                <span className={styles.selchev}><ChevronDown size={18} /></span>
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="validity">Token validity (days)</label>
              <div className={styles.inputwrap}>
                <input id="validity" className={styles.input} inputMode="numeric" placeholder="e.g. 7 (0 = off)"
                  value={validity} onChange={(e) => setValidity(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </div>
              <span className={styles.hint}>Days a paid visit&apos;s token stays valid for a free re-book using the appointment ID. Leave blank or 0 to disable.</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.footer}>
        {busy && phaseText && (
          <div style={{ margin: '0 2px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-ink)', marginBottom: 6 }}>{phaseText}</div>
            {(phase === 'logo' || phase === 'banner') && (
              <div style={{ height: 6, borderRadius: 999, background: '#e6eaf0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${phasePct}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width .2s ease' }} />
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" style={{ margin: '0 2px 12px', fontSize: 13.5, fontWeight: 500, color: 'var(--danger)', lineHeight: 1.5 }}>
            {error}
          </p>
        )}
        <button className={styles.primary} onClick={next} disabled={busy || !stepValid(step)}>
          {cta}
        </button>
      </div>
    </main>
  );
}

