'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Avatar from '../../_components/Avatar';
import Toggle from '../../_components/Toggle';
import EmptyState from '../../_components/EmptyState';
import { Edit, Star, Calendar, ChevronRight, IndianRupee, Activity, ClipboardList, Tag } from '../../_components/icons';
import { findDoctor, SERVICES, rupee } from '../../_lib/data';
import { tapLight } from '../../_lib/haptic';

export default function DoctorDetail() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [active, setActive] = useState(true);
  const go = (r) => { tapLight(); router.push(r); };

  useEffect(() => {
    const qid = new URLSearchParams(window.location.search).get('id');
    setId(qid);
    setActive(findDoctor(qid).active);
  }, []);

  const d = findDoctor(id);
  const services = SERVICES.filter((s) => s.active);

  return (
    <Screen>
      <TopBar
        title="Doctor details"
        right={(
          <button className="icon-btn" aria-label="Edit doctor" onClick={() => go(`/doctors/edit?id=${d.id}`)}>
            <Edit size={19} />
          </button>
        )}
      />
      <div className="content">
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={d.name} size={72} status={active ? 'on' : 'off'} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{d.name}</h2>
              <div style={{ color: 'var(--muted-fg)', fontSize: 13.5, marginTop: 2 }}>{d.spec}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="chip chip-accent" style={{ gap: 4 }}><Star size={13} /> {d.rating}</span>
                <span className={`badge ${active ? 'badge-success' : 'badge-muted'}`}>
                  <span className="badge-dot" />{active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-grid g3">
          <div className="stat"><div className="st-ic"><ClipboardList size={19} /></div><div className="st-v">{d.appts.toLocaleString('en-IN')}</div><div className="st-l">Appointments</div></div>
          <div className="stat warn"><div className="st-ic"><Star size={19} /></div><div className="st-v">{d.rating}</div><div className="st-l">Rating</div></div>
          <div className="stat accent"><div className="st-ic"><IndianRupee size={19} /></div><div className="st-v money">{rupee(d.fee)}</div><div className="st-l">Fee</div></div>
        </div>

        <section className="section"><div className="section-head"><h2>Credentials</h2></div></section>
        <div className="pad">
          <div className="card" style={{ padding: '4px 16px' }}>
            <div className="breakdown">
              <div className="br"><span className="lbl">Qualification</span><span className="val">{d.qual}</span></div>
              <div className="br"><span className="lbl">Experience</span><span className="val">{d.exp}</span></div>
              <div className="br"><span className="lbl">Registration</span><span className="val">{d.reg}</span></div>
              <div className="br"><span className="lbl">Phone</span><span className="val">{d.phone}</span></div>
              <div className="br"><span className="lbl">Email</span><span className="val" style={{ maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{d.email}</span></div>
            </div>
          </div>
        </div>

        <section className="section"><div className="section-head"><h2>Services offered</h2></div></section>
        <div className="pad">
          <div className="card" style={{ padding: '4px 16px' }}>
            {services.length === 0 ? (
              <EmptyState icon={<Tag size={26} />} title="No services" hint="Add services to offer them here." />
            ) : (
              <div className="breakdown">
                {services.map((s) => (
                  <div key={s.id} className="br">
                    <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg)', fontWeight: 600 }}>
                      <span className="dot" style={{ background: 'var(--accent)' }} />{s.name}
                    </span>
                    <span className="val">{rupee(s.fee)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="section"><div className="section-head"><h2>Schedule</h2><button className="link" onClick={() => go('/schedule')}>Manage</button></div></section>
        <div className="pad">
          <button className="up-row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => go('/schedule')}>
            <span className="ur-ic"><Calendar size={20} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>Mon – Sat · 9:00 AM – 8:00 PM</span>
              <span style={{ display: 'block', color: 'var(--muted-fg)', fontSize: 12.5, marginTop: 2 }}>15 min slots · Sunday off</span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
          </button>
        </div>

        <section className="section"><div className="section-head"><h2>Manage</h2></div></section>
        <div className="set-group" style={{ marginLeft: 22, marginRight: 22 }}>
          <div className="set-row" style={{ cursor: 'default' }}>
            <span className="sr-ic"><Activity size={18} /></span>
            <span className="sr-t">Accepting appointments</span>
            <Toggle on={active} onChange={setActive} label="Toggle accepting appointments" />
          </div>
          <button className="set-row" onClick={() => go('/schedule')}>
            <span className="sr-ic"><Calendar size={18} /></span>
            <span className="sr-t">Manage schedule</span>
            <ChevronRight size={18} style={{ color: 'var(--faint-fg)' }} />
          </button>
        </div>

        <div className="pad" style={{ marginTop: 14, paddingBottom: 28 }}>
          <button className="btn btn-primary btn-block" onClick={() => go(`/doctors/edit?id=${d.id}`)}>
            <Edit size={18} /> Edit profile
          </button>
        </div>
      </div>
    </Screen>
  );
}
