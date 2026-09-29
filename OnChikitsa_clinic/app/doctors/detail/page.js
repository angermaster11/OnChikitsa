'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import Toggle from '../../_components/Toggle';
import Sheet from '../../_components/Sheet';
import EmptyState from '../../_components/EmptyState';
import { Edit, Trash, ChevronRight, Activity, Stethoscope } from '../../_components/icons';
import { tapLight, notify } from '../../_lib/haptic';
import { doctorApi } from '../../_lib/api';

const orDash = (v) => (v == null || String(v).trim() === '' ? '—' : v);

export default function DoctorDetail() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const go = (r) => { tapLight(); router.push(r); };

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    setId(qid);
    let alive = true;
    (async () => {
      try {
        // No single-doctor endpoint for clinics — pull the clinic's list and match.
        const list = await doctorApi.list();
        const found = Array.isArray(list) ? list.find((x) => (x._id || x.id) === qid) : null;
        if (alive) { setDoc(found || null); if (!found) setError('This doctor no longer exists.'); }
      } catch (e) {
        if (alive) setError(e?.message || 'Could not load this doctor.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const active = doc ? doc.status !== 'INACTIVE' : false;

  async function toggleActive(on) {
    if (!doc || busy) return;
    setBusy(true);
    const prev = doc.status;
    setDoc((d) => ({ ...d, status: on ? 'ACTIVE' : 'INACTIVE' })); // optimistic
    try {
      await doctorApi.update(id, { status: on ? 'ACTIVE' : 'INACTIVE' });
      notify('SUCCESS');
    } catch {
      setDoc((d) => ({ ...d, status: prev })); // revert on failure
      notify('ERROR');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!id || busy) return;
    setBusy(true);
    tapLight();
    try {
      await doctorApi.remove(id);
      notify('SUCCESS');
      router.replace('/doctors');
    } catch (e) {
      setBusy(false);
      setConfirm(false);
      setError(e?.message || 'Could not delete the doctor.');
      notify('ERROR');
    }
  }

  if (loading) {
    return (
      <Screen>
        <TopBar title="Doctor details" />
        <div className="content">
          <p style={{ padding: '28px 4px', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 14 }}>Loading…</p>
        </div>
      </Screen>
    );
  }
  if (!doc) {
    return (
      <Screen>
        <TopBar title="Doctor details" />
        <div className="content">
          <EmptyState
            icon={<Stethoscope size={30} />}
            title="Doctor not found"
            hint={error}
            action={<button className="btn btn-outline" onClick={() => go('/doctors')}>Back to doctors</button>}
          />
        </div>
      </Screen>
    );
  }

  const exp = Number.isFinite(doc.experience) ? `${doc.experience} yr${doc.experience === 1 ? '' : 's'}` : '';

  return (
    <Screen>
      <TopBar
        title="Doctor details"
        right={(
          <button className="icon-btn" aria-label="Edit doctor" onClick={() => go(`/doctors/edit?id=${id}`)}>
            <Edit size={19} />
          </button>
        )}
      />
      <div className="content">
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={doc.name} src={doc.photo} size={72} status={active ? 'on' : 'off'} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{doc.name}</h2>
              <div style={{ color: 'var(--muted-fg)', fontSize: 13.5, marginTop: 2 }}>{orDash(doc.specialization)}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${active ? 'badge-success' : 'badge-muted'}`}>
                  <span className="badge-dot" />{active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="section"><div className="section-head"><h2>Credentials</h2></div></section>
        <div className="pad">
          <div className="card" style={{ padding: '4px 16px' }}>
            <div className="breakdown">
              <div className="br"><span className="lbl">Qualification</span><span className="val">{orDash(doc.qualification)}</span></div>
              <div className="br"><span className="lbl">Experience</span><span className="val">{orDash(exp)}</span></div>
              <div className="br"><span className="lbl">Registration</span><span className="val">{orDash(doc.registrationNo)}</span></div>
              <div className="br"><span className="lbl">Phone</span><span className="val">{orDash(doc.phone)}</span></div>
              <div className="br"><span className="lbl">Email</span><span className="val" style={{ maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{orDash(doc.email)}</span></div>
            </div>
          </div>
        </div>

        <section className="section"><div className="section-head"><h2>Manage</h2></div></section>
        <div className="set-group" style={{ marginLeft: 22, marginRight: 22 }}>
          <div className="set-row" style={{ cursor: 'default' }}>
            <span className="sr-ic"><Activity size={18} /></span>
            <span className="sr-t">Accepting appointments</span>
            <Toggle on={active} onChange={toggleActive} label="Toggle accepting appointments" />
          </div>
          <button className="set-row" onClick={() => go(`/doctors/edit?id=${id}`)}>
            <span className="sr-ic"><Edit size={18} /></span>
            <span className="sr-t">Edit profile</span>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
          </button>
          <button className="set-row danger" onClick={() => { tapLight(); setConfirm(true); }}>
            <span className="sr-ic"><Trash size={18} /></span>
            <span className="sr-t">Delete doctor</span>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
          </button>
        </div>

        {error && (
          <p role="alert" style={{ margin: '10px 22px 0', fontSize: 13, color: 'var(--danger)' }}>{error}</p>
        )}
        <div style={{ height: 28 }} />
      </div>

      <Sheet open={confirm} onClose={() => { if (!busy) setConfirm(false); }} title="Delete doctor?">
        <p style={{ color: 'var(--muted-fg)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          {doc.name} will be removed from your clinic. This can’t be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }} onClick={del} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
