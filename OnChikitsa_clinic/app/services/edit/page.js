'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Field from '../../_components/Field';
import Toggle from '../../_components/Toggle';
import Stepper from '../../_components/Stepper';
import Segmented from '../../_components/Segmented';
import { Tag, IndianRupee, FileText, CheckCircle } from '../../_components/icons';
import { findService } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

const GST_RATES = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
];

export default function EditService() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', desc: '', fee: '', mins: 15, gst: 0, active: true });
  const [editing, setEditing] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setV = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    const s = qid ? findService(qid) : null;
    if (s) {
      setF({ name: s.name, desc: s.desc, fee: String(s.fee), mins: s.mins, gst: s.gst, active: s.active });
      setEditing(true);
    }
  }, []);

  function save(e) {
    e.preventDefault();
    tapLight();
    router.back();
  }

  return (
    <Screen>
      <TopBar title={editing ? 'Edit service' : 'Add service'} subtitle={editing ? f.name : 'New service'} />
      <div className="content">
        <form onSubmit={save} className="pad" style={{ paddingTop: 12, paddingBottom: 28 }}>
          <Field label="Service name" htmlFor="s-name" required lead={<Tag size={18} />}>
            <input id="s-name" className="input" placeholder="e.g. General Consultation" value={f.name} onChange={set('name')} />
          </Field>

          <Field label="Description" htmlFor="s-desc" optional bare>
            <textarea
              id="s-desc"
              className="input"
              rows={3}
              placeholder="Short description shown to patients"
              value={f.desc}
              onChange={set('desc')}
              style={{ background: 'var(--field)', border: '1.5px solid transparent', borderRadius: 14, padding: '12px 15px', minHeight: 88, resize: 'vertical', width: '100%', lineHeight: 1.4 }}
            />
          </Field>

          <Field label="Consultation fee" htmlFor="s-fee" required lead={<IndianRupee size={18} />}>
            <input id="s-fee" className="input" type="number" inputMode="numeric" placeholder="500" value={f.fee} onChange={set('fee')} />
          </Field>

          <Field label="Duration" htmlFor="s-mins" bare>
            <Stepper value={f.mins} onChange={setV('mins')} min={5} max={180} step={5} suffix="min" />
          </Field>

          <Field label="GST / Tax" bare>
            <Segmented options={GST_RATES} value={f.gst} onChange={setV('gst')} />
          </Field>

          <div className="up-row" style={{ marginTop: 6 }}>
            <span className="ur-ic"><CheckCircle size={20} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>Active</span>
              <span style={{ display: 'block', color: 'var(--muted-fg)', fontSize: 12.5, marginTop: 2 }}>Available for booking</span>
            </span>
            <Toggle on={f.active} onChange={setV('active')} label="Toggle service active" />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Save</button>
        </form>
      </div>
    </Screen>
  );
}
