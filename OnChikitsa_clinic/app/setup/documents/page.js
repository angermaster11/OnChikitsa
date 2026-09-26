'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import { FileText, Award, User, Upload, Check, Shield, Info } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';

const STEP = 5;

const DOCS = [
  { key: 'reg', title: 'Clinic registration', hint: 'Registration / incorporation certificate', Icon: FileText },
  { key: 'lic', title: 'License / certificate', hint: 'Medical practice license or council certificate', Icon: Award },
  { key: 'id', title: 'Owner ID proof', hint: 'Aadhaar, PAN or passport of the owner', Icon: User },
];

export default function VerificationDocuments() {
  const router = useRouter();
  // reg starts uploaded to show both badge states with mock data
  const [uploaded, setUploaded] = useState({ reg: true, lic: false, id: false });

  const allDone = DOCS.every((d) => uploaded[d.key]);

  function toggle(key) {
    tapLight();
    setUploaded((u) => ({ ...u, [key]: !u[key] }));
  }
  function submit() {
    if (!allDone) return;
    tapLight();
    router.push('/setup/complete');
  }

  return (
    <Screen>
      <TopBar title="Verification documents" subtitle="Step 5 of 6" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="wiz">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`wseg ${n < STEP ? 'done' : ''} ${n === STEP ? 'now' : ''}`} />
          ))}
        </div>
        <div className="wiz-step">Upload documents for verification</div>

        <div className="pad" style={{ paddingTop: 14, flex: 1 }}>
          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, marginBottom: 16,
            background: 'var(--primary-tint)', color: 'var(--primary)',
          }}>
            <Info size={18} style={{ flex: 'none', marginTop: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
              Documents are reviewed by our team. Clear photos or PDFs speed up approval.
            </span>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            {DOCS.map(({ key, title, hint, Icon }) => {
              const done = uploaded[key];
              return (
                <button key={key} type="button" className="up-row"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  aria-label={done ? `${title} uploaded — tap to replace` : `Upload ${title}`}
                  aria-pressed={done} onClick={() => toggle(key)}>
                  <span className="ur-ic" style={done ? { background: 'var(--accent-tint)', color: 'var(--accent-strong)' } : undefined}>
                    <Icon size={20} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{hint}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
                      {done ? <><Check size={15} /> Replace file</> : <><Upload size={15} /> Tap to upload</>}
                    </span>
                  </span>
                  <span className={`badge ${done ? 'badge-success' : 'badge-warning'}`} style={{ flex: 'none' }}>
                    <span className="badge-dot" />{done ? 'Uploaded' : 'Pending'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pad" style={{ paddingTop: 8, paddingBottom: 'calc(20px + var(--sab))' }}>
          {!allDone && (
            <p className="field-msg hint" style={{ textAlign: 'center', marginBottom: 8 }}>
              Upload all documents to submit for verification.
            </p>
          )}
          <button className="btn btn-primary btn-block" onClick={submit} disabled={!allDone}>
            <Shield size={20} /> Submit for verification
          </button>
        </div>
      </div>
    </Screen>
  );
}
