'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Building, Phone, Mail, MapPin,
  Camera, Image as ImageIcon, Check, ChevronDown, Navigation, RefreshCw,
} from '../_components/icons';
import { SPECIALIZATIONS } from '../_lib/data';
import { tapLight, notify } from '../_lib/haptic';
import { clinicApi, uploadToCloudinary } from '../_lib/api';
import { requestLocation } from '../_lib/permissions';
import styles from './profile.module.css';

const TIMES = [10, 15, 20, 30, 45, 60];
const timeLabel = (m) => (m === 60 ? '1 hour' : `${m} minutes`);
const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
const cleanPhone = (v) => String(v || '').replace(/[^\d+]/g, '');
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export default function ClinicProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [phase, setPhase] = useState(null); // 'logo' | 'banner' | 'save'
  const [pct, setPct] = useState(0);

  const [name, setName] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [about, setAbout] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [fee, setFee] = useState('');
  const [avg, setAvg] = useState('');
  const [specs, setSpecs] = useState([]);

  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [locErr, setLocErr] = useState('');

  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState('');
  const logoInput = useRef(null);
  const bannerInput = useRef(null);

  // Load the clinic's real profile. Extracted so the error state can retry it.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const me = await clinicApi.getMe();
      if (me) {
        setName(me.name || '');
        setPhone1(me.phone1 || '');
        setPhone2(me.phone2 || '');
        setEmail(me.email || '');
        setAbout(me.description || '');
        const a = me.address || {};
        setLine(a.line || ''); setCity(a.city || ''); setStateName(a.state || ''); setPincode(a.pincode || '');
        setFee(me.consultationFee != null ? String(me.consultationFee) : '');
        setAvg(me.averageConsultationTime ? String(me.averageConsultationTime) : '');
        setSpecs(Array.isArray(me.specialties) ? me.specialties : []);
        setLogo(me.logo || ''); setBanner(me.banner || '');
        if (me.location && me.location.lat != null) {
          setCoords({ lat: me.location.lat, lng: me.location.lng, accuracy: me.location.accuracy });
          setLocated(true);
        }
      }
    } catch (e) {
      setLoadErr(e?.message || 'Could not load your clinic profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);
  useEffect(() => () => { if (bannerUrl) URL.revokeObjectURL(bannerUrl); }, [bannerUrl]);

  function pickImage(kind, file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (kind === 'logo') { if (logoUrl) URL.revokeObjectURL(logoUrl); setLogoFile(file); setLogoUrl(url); }
    else { if (bannerUrl) URL.revokeObjectURL(bannerUrl); setBannerFile(file); setBannerUrl(url); }
  }

  function toggleSpec(s) {
    tapLight();
    setSpecs((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function useCurrentLocation() {
    if (locating) return;
    setLocating(true); setLocErr(''); tapLight();
    try {
      const res = await requestLocation();
      if (res.state === 'granted' && res.coords) {
        const { lat, lng, accuracy } = res.coords;
        setCoords({ lat, lng, accuracy });
        setLocated(true);
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

  async function save() {
    if (busy || loading) return;
    if (name.trim().length < 2) { setErr('Please enter your clinic name.'); return; }
    const p1 = cleanPhone(phone1);
    if (digitsOnly(p1).length < 7) { setErr('Please enter a valid primary phone number.'); return; }
    setBusy(true); setErr('');
    try {
      const patch = { name: name.trim(), phone1: p1 };
      const p2 = cleanPhone(phone2);
      if (digitsOnly(p2).length >= 7) patch.phone2 = p2;
      if (emailOk(email)) patch.email = email.trim();
      if (about.trim()) patch.description = about.trim();
      const addr = {};
      if (line.trim()) addr.line = line.trim();
      if (city.trim()) addr.city = city.trim();
      if (stateName.trim()) addr.state = stateName.trim();
      if (pincode.trim()) addr.pincode = pincode.trim();
      const parts = [addr.line, addr.city, addr.state, addr.pincode].filter(Boolean);
      if (parts.length) { addr.formatted = parts.join(', '); patch.address = addr; }
      if (coords) patch.location = coords;
      const feeN = parseInt(digitsOnly(fee), 10);
      if (Number.isFinite(feeN) && feeN >= 0) patch.consultationFee = feeN;
      const avgN = parseInt(avg, 10);
      if (Number.isFinite(avgN) && avgN > 0) patch.averageConsultationTime = avgN;
      if (specs.length) patch.specialties = specs;

      if (logoFile) {
        setPhase('logo'); setPct(0);
        try { patch.logo = await uploadToCloudinary(logoFile, 'logo', setPct); } catch { /* skip */ }
      }
      if (bannerFile) {
        setPhase('banner'); setPct(0);
        try { patch.banner = await uploadToCloudinary(bannerFile, 'banner', setPct); } catch { /* skip */ }
      }
      setPhase('save');
      await clinicApi.updateMe(patch);
      notify('SUCCESS');
      router.back();
    } catch (e) {
      setPhase(null);
      setBusy(false);
      setErr(e?.message || 'Could not save your changes. Please try again.');
    }
  }

  const bannerSrc = bannerUrl || banner;
  const logoSrc = logoUrl || logo;
  const phaseText =
    phase === 'logo' ? `Uploading logo… ${pct}%`
      : phase === 'banner' ? `Uploading banner… ${pct}%`
        : phase === 'save' ? 'Saving changes…' : '';
  const showBar = phase === 'logo' || phase === 'banner';

  return (
    <main className={styles.root}>
      <header className={styles.top}>
        <button className={styles.back} aria-label="Back" onClick={() => { tapLight(); router.back(); }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className={styles.htitle}>Clinic profile</h1>
          <p className={styles.hsub}>Edit your details</p>
        </div>
      </header>

      <div className={styles.scroll}>
        {loading ? (
          <p className={styles.loading}>Loading profile…</p>
        ) : loadErr ? (
          <div className={styles.loadErr} role="alert">
            <p className={styles.loadErrText}>{loadErr}</p>
            <button type="button" className={styles.retryBtn} onClick={() => { tapLight(); load(); }}>
              <RefreshCw size={17} />Try again
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => pickImage('banner', e.target.files?.[0])} />
            <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => pickImage('logo', e.target.files?.[0])} />

            <div className={styles.hero}>
              <button type="button" className={styles.banner} aria-label="Change banner"
                onClick={() => { tapLight(); bannerInput.current?.click(); }}
                style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}>
                {!bannerSrc && (<><ImageIcon size={22} /><span className={styles.bannerHint}>Add cover banner</span></>)}
                <span className={styles.camBadge}><Camera size={16} /></span>
              </button>
              <div className={styles.logoWrap}>
                <button type="button" className={styles.logo} aria-label="Change logo"
                  onClick={() => { tapLight(); logoInput.current?.click(); }}
                  style={logoSrc ? { backgroundImage: `url(${logoSrc})` } : undefined}>
                  {!logoSrc && <Camera size={24} />}
                  <span className={styles.logoCam}><Camera size={13} /></span>
                </button>
              </div>
            </div>

            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-name">Clinic name</label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><Building size={18} /></span>
                <input id="p-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic name" />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-ph1">Primary phone</label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><Phone size={18} /></span>
                <input id="p-ph1" className={styles.input} type="tel" inputMode="tel" value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="+919000000000" />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-ph2">Secondary phone <span className={styles.opt}>(optional)</span></label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><Phone size={18} /></span>
                <input id="p-ph2" className={styles.input} type="tel" inputMode="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="+919000000000" />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-email">Email <span className={styles.opt}>(optional)</span></label>
              <div className={styles.inputwrap}>
                <span className={styles.lead}><Mail size={18} /></span>
                <input id="p-email" className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="clinic@example.com" />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-about">About <span className={styles.opt}>(optional)</span></label>
              <div className={styles.taWrap}>
                <textarea id="p-about" className={styles.textarea} rows={4} maxLength={600} value={about}
                  onChange={(e) => setAbout(e.target.value)} placeholder="A short introduction patients will see…" />
                <span className={styles.counter}>{about.length}/600</span>
              </div>
            </div>

            <div className={styles.group}>
              <label className={styles.label}>Specializations</label>
              <div className={styles.chips}>
                {SPECIALIZATIONS.map((s) => {
                  const on = specs.includes(s);
                  return (
                    <button key={s} type="button" className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                      aria-pressed={on} onClick={() => toggleSpec(s)}>
                      {on ? <Check size={14} /> : null}{s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.group}>
              <label className={styles.label}>Address <span className={styles.opt}>(optional)</span></label>
              <button type="button" className={`${styles.locBtn} ${located ? styles.locOn : ''}`}
                onClick={useCurrentLocation} disabled={locating}>
                {located ? <Check size={18} /> : <Navigation size={18} />}
                {locating ? 'Getting location…' : located ? 'Location captured' : 'Use current location'}
              </button>
              {locErr && <p className={styles.locErr} role="alert">{locErr}</p>}
              <div className={styles.inputwrap}>
                <span className={styles.lead}><MapPin size={18} /></span>
                <input className={styles.input} value={line} onChange={(e) => setLine(e.target.value)} placeholder="Building, street, area" />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="p-city">City</label>
                <div className={styles.inputwrap}>
                  <input id="p-city" className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="p-state">State</label>
                <div className={styles.inputwrap}>
                  <input id="p-state" className={styles.input} value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" />
                </div>
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="p-pin">Pincode</label>
              <div className={styles.inputwrap}>
                <input id="p-pin" className={styles.input} inputMode="numeric" value={pincode}
                  onChange={(e) => setPincode(digitsOnly(e.target.value).slice(0, 6))} placeholder="6-digit pincode" />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="p-fee">Consultation fee</label>
                <div className={styles.feeWrap}>
                  <span className={styles.feePrefix}>₹</span>
                  <input id="p-fee" className={styles.feeInput} inputMode="numeric" value={fee}
                    onChange={(e) => setFee(digitsOnly(e.target.value).slice(0, 6))} placeholder="500" />
                </div>
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="p-avg">Avg. time</label>
                <div className={styles.selectwrap}>
                  <select id="p-avg" className={`${styles.select} ${!avg ? styles.empty : ''}`} value={avg} onChange={(e) => setAvg(e.target.value)}>
                    <option value="">Select</option>
                    {TIMES.map((m) => <option key={m} value={m}>{timeLabel(m)}</option>)}
                  </select>
                  <span className={styles.selchev}><ChevronDown size={18} /></span>
                </div>
              </div>
            </div>

            {phaseText && <p className={styles.phase}>{phaseText}</p>}
            {showBar && <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>}
            {err && <p className={styles.err} role="alert">{err}</p>}

            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
