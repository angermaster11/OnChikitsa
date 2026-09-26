'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import { Image, Camera, Plus, X, Check, ArrowRight } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';

const STEP = 4;
const TINTS = ['var(--primary-tint)', 'var(--accent-tint)', '#fff2e6', '#fce8ee'];

export default function ClinicPhotos() {
  const router = useRouter();
  const [logo, setLogo] = useState(false);
  const [cover, setCover] = useState(false);
  const [gallery, setGallery] = useState([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const [nextId, setNextId] = useState(4);

  function addPhoto() {
    tapLight();
    setGallery((g) => [...g, { id: nextId }]);
    setNextId((n) => n + 1);
  }
  function removePhoto(id) {
    tapLight();
    setGallery((g) => g.filter((p) => p.id !== id));
  }
  function cont() { tapLight(); router.push('/setup/documents'); }

  return (
    <Screen>
      <TopBar title="Clinic photos" subtitle="Step 4 of 6" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="wiz">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`wseg ${n < STEP ? 'done' : ''} ${n === STEP ? 'now' : ''}`} />
          ))}
        </div>
        <div className="wiz-step">Add your logo, cover and photos</div>

        <div className="pad" style={{ paddingTop: 14, flex: 1 }}>
          <div className="field">
            <span className="field-label">Clinic logo <span className="field-opt">Optional</span></span>
            <button type="button" className="up-tile" aria-label="Upload clinic logo"
              onClick={() => { tapLight(); setLogo((v) => !v); }}
              style={logo ? { borderStyle: 'solid', borderColor: 'var(--accent)', color: 'var(--accent-strong)', background: 'var(--accent-tint)' } : undefined}>
              {logo ? <Check size={26} /> : <Image size={26} />}
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{logo ? 'Logo added' : 'Upload logo'}</span>
              <span className="ut-hint">{logo ? 'Tap to remove' : 'PNG or JPG · square works best'}</span>
            </button>
          </div>

          <div className="field">
            <span className="field-label">Cover image <span className="field-opt">Optional</span></span>
            <button type="button" className="up-tile" aria-label="Upload cover image"
              onClick={() => { tapLight(); setCover((v) => !v); }}
              style={cover ? { borderStyle: 'solid', borderColor: 'var(--accent)', color: 'var(--accent-strong)', background: 'var(--accent-tint)' } : undefined}>
              {cover ? <Check size={26} /> : <Camera size={26} />}
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{cover ? 'Cover added' : 'Upload cover image'}</span>
              <span className="ut-hint">{cover ? 'Tap to remove' : 'Wide 16:9 image shown on your profile'}</span>
            </button>
          </div>

          <div className="field" style={{ marginBottom: 4 }}>
            <span className="field-label">Gallery <span className="field-opt">{gallery.length} photos</span></span>
            <div className="photo-grid">
              {gallery.map((p, i) => (
                <div key={p.id} className="ph-cell" style={{ background: TINTS[i % TINTS.length] }}>
                  <Image size={22} />
                  <button className="rm" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(p.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="ph-cell" aria-label="Add photo"
                onClick={addPhoto}
                style={{ border: '1.5px dashed var(--border-strong)', color: 'var(--primary)', cursor: 'pointer' }}>
                <Plus size={24} />
              </button>
            </div>
            {gallery.length === 0 && (
              <span className="field-msg hint">Add a few photos of your clinic to build patient trust.</span>
            )}
          </div>
        </div>

        <div className="pad" style={{ paddingTop: 8, paddingBottom: 'calc(20px + var(--sab))' }}>
          <button className="btn btn-primary btn-block" onClick={cont}>
            Continue <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </Screen>
  );
}
