'use client';

import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import { Shield, Clock, Building, ArrowRight } from '../../_components/icons';
import { CLINIC } from '../../_lib/data';
import { flow } from '../../_lib/flow';
import { tapLight, notify } from '../../_lib/haptic';

export default function SetupComplete() {
  const router = useRouter();

  function toDashboard() {
    tapLight();
    notify('SUCCESS');
    flow.setClinicSetup();
    router.replace('/dashboard');
  }

  return (
    <Screen>
      <TopBar title="All done" subtitle="Step 6 of 6" back={false} />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="wiz">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className="wseg done" />
          ))}
        </div>

        <div className="pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6 }}>
          <div style={{
            width: 104, height: 104, borderRadius: 34, display: 'grid', placeItems: 'center',
            background: 'var(--accent-tint)', color: 'var(--accent-strong)', marginBottom: 6,
            boxShadow: 'var(--shadow-accent)',
          }}>
            <Shield size={52} />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>You&apos;re all set!</h1>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--muted-fg)', fontSize: 14, fontWeight: 600 }}>
            <Building size={16} /> {CLINIC.name}
          </div>

          <span className="badge badge-warning" style={{ marginTop: 12, padding: '6px 12px', fontSize: 12 }}>
            <span className="badge-dot" /> Verification Pending
          </span>

          <p style={{ color: 'var(--muted-fg)', fontSize: 14, marginTop: 12, maxWidth: '32ch', lineHeight: 1.55 }}>
            Our team is reviewing your clinic. You&apos;ll be notified once your documents are approved — you can start setting up in the meantime.
          </p>

          <div className="card" style={{
            marginTop: 18, width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: 14, border: '1px solid var(--border)', textAlign: 'left',
          }}>
            <span className="thumb-ic" style={{ width: 42, height: 42, background: 'var(--primary-tint)', color: 'var(--primary)' }}>
              <Clock size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Usually reviewed within 24 hours</div>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>We&apos;ll email and notify you on approval.</div>
            </div>
          </div>
        </div>

        <div className="pad" style={{ paddingTop: 4, paddingBottom: 'calc(20px + var(--sab))' }}>
          <button className="btn btn-primary btn-block" onClick={toDashboard}>
            Continue to dashboard <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </Screen>
  );
}
