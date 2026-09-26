'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import { MapPin, Navigation, ArrowRight, Check } from '../../_components/icons';
import { CLINIC } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const STEP = 2;

export default function ClinicAddress() {
  const router = useRouter();
  const [address, setAddress] = useState(CLINIC.address);
  const [city, setCity] = useState(CLINIC.city);
  const [state, setState] = useState(CLINIC.state);
  const [pincode, setPincode] = useState(CLINIC.pincode);
  const [located, setLocated] = useState(false);

  const canContinue = address.trim() && city.trim() && state.trim() && pincode.trim().length >= 5;

  function useCurrentLocation() {
    tapLight();
    // UI-level demo: pretend the device geolocated and pin-dropped the clinic.
    setLocated(true);
  }
  function cont() {
    if (!canContinue) return;
    tapLight();
    router.push('/setup/details');
  }

  return (
    <Screen>
      <TopBar title="Clinic address" subtitle="Step 2 of 6" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="wiz">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`wseg ${n < STEP ? 'done' : ''} ${n === STEP ? 'now' : ''}`} />
          ))}
        </div>
        <div className="wiz-step">Where is your clinic located?</div>

        <div className="pad" style={{ paddingTop: 14, flex: 1 }}>
          {/* Map placeholder */}
          <div style={{
            position: 'relative', height: 160, borderRadius: 'var(--radius)', overflow: 'hidden',
            border: '1px solid var(--border)', marginBottom: 8,
            background:
              'repeating-linear-gradient(0deg, var(--field) 0 19px, var(--border) 19px 20px),' +
              'repeating-linear-gradient(90deg, var(--field) 0 19px, var(--border) 19px 20px)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              color: located ? 'var(--accent-strong)' : 'var(--muted-fg)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MapPin size={located ? 34 : 28} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {located ? 'Pinned to your current location' : 'Map preview'}
                </span>
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-soft btn-block" style={{ marginBottom: 18 }}
            onClick={useCurrentLocation} aria-label="Use current location">
            {located ? <><Check size={19} /> Location set</> : <><Navigation size={19} /> Use current location</>}
          </button>

          <Field label="Address" htmlFor="addr" required lead={<MapPin size={18} />}>
            <input id="addr" className="input" value={address} placeholder="Building, street, area"
              onChange={(e) => setAddress(e.target.value)} />
          </Field>

          <div className="field-row">
            <Field label="City" htmlFor="city" required>
              <input id="city" className="input" value={city} placeholder="City"
                onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="State" htmlFor="state" required>
              <input id="state" className="input" value={state} placeholder="State"
                onChange={(e) => setState(e.target.value)} />
            </Field>
          </div>

          <Field label="Pincode" htmlFor="pin" required>
            <input id="pin" className="input" type="tel" inputMode="numeric" maxLength={6} value={pincode}
              placeholder="201301" onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>

        <div className="pad" style={{ paddingTop: 4, paddingBottom: 'calc(20px + var(--sab))' }}>
          <button className="btn btn-primary btn-block" onClick={cont} disabled={!canContinue}>
            Continue <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </Screen>
  );
}
