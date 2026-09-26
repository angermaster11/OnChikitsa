'use client';

import { useState } from 'react';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import SubTabs from '../_components/SubTabs';
import Sheet from '../_components/Sheet';
import Avatar from '../_components/Avatar';
import EmptyState from '../_components/EmptyState';
import { Star, MessageSquare } from '../_components/icons';
import { REVIEWS } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

function Stars({ n, size = 14 }) {
  return (
    <span className="stars" style={{ display: 'inline-flex', gap: 2, color: 'var(--star)' }} aria-label={`${n} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} style={{ color: i < n ? 'var(--star)' : 'var(--border-strong)' }} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const [tab, setTab] = useState('clinic');
  const [items, setItems] = useState(REVIEWS.items);
  const [replyTo, setReplyTo] = useState(null);
  const [draft, setDraft] = useState('');

  const openReply = (r) => { tapLight(); setDraft(''); setReplyTo(r); };
  const saveReply = () => {
    setItems((xs) => xs.map((it) => (it.id === replyTo.id ? { ...it, reply: draft.trim() } : it)));
    setReplyTo(null);
  };

  const groups = Object.values(
    items.reduce((acc, it) => {
      (acc[it.doctor] = acc[it.doctor] || { doctor: it.doctor, items: [] }).items.push(it);
      return acc;
    }, {})
  );

  const renderReview = (r) => (
    <div className="card" key={r.id} style={{ padding: 15, margin: '0 22px 10px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar name={r.patient} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>{r.patient}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{r.doctor} · {r.date}</div>
        </div>
        <Stars n={r.stars} />
      </div>
      <p style={{ fontSize: 13.5, marginTop: 10, lineHeight: 1.5 }}>{r.text}</p>
      {r.reply ? (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--field)', borderRadius: 12, borderLeft: '3px solid var(--primary)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)' }}>Clinic response</div>
          <div style={{ fontSize: 13, marginTop: 3 }}>{r.reply}</div>
        </div>
      ) : (
        <button className="btn btn-soft" style={{ marginTop: 10, minHeight: 44 }} onClick={() => openReply(r)}>
          <MessageSquare size={16} /> Reply
        </button>
      )}
    </div>
  );

  return (
    <Screen>
      <TopBar title="Reviews" />
      <div className="content">
        <div className="rating-big">
          <div style={{ textAlign: 'center' }}>
            <div className="score">{REVIEWS.overall}</div>
            <Stars n={Math.round(REVIEWS.overall)} size={15} />
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 4 }}>{REVIEWS.total} reviews</div>
          </div>
          <div className="rdist">
            {REVIEWS.dist.map(({ s, n }) => (
              <div className="rd" key={s}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minWidth: 26 }}>
                  {s}<Star size={9} style={{ color: 'var(--star)' }} />
                </span>
                <div className="progress star"><span style={{ width: `${(n / REVIEWS.total) * 100}%` }} /></div>
                <span style={{ minWidth: 22, textAlign: 'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <SubTabs
          tabs={[{ key: 'clinic', label: 'Clinic' }, { key: 'doctor', label: 'Doctor-wise' }]}
          active={tab}
          onChange={setTab}
        />
        <div style={{ height: 6 }} />
        {items.length === 0 ? (
          <EmptyState icon={<Star size={30} />} title="No reviews yet" hint="Patient reviews will appear here after visits." />
        ) : tab === 'clinic' ? (
          items.map((r) => renderReview(r))
        ) : (
          groups.map((g) => (
            <div key={g.doctor}>
              <div className="section">
                <div className="section-head">
                  <h2 style={{ fontSize: 15 }}>{g.doctor}</h2>
                  <span style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>{g.items.length} {g.items.length === 1 ? 'review' : 'reviews'}</span>
                </div>
              </div>
              {g.items.map((r) => renderReview(r))}
            </div>
          ))
        )}
        <div style={{ height: 16 }} />
      </div>
      <Sheet open={!!replyTo} onClose={() => setReplyTo(null)} title="Reply to review">
        {replyTo && (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 12 }}>
              Responding to <b style={{ color: 'var(--fg)' }}>{replyTo.patient}</b>
            </div>
            <textarea
              className="input"
              aria-label="Your reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a thoughtful response…"
              style={{ width: '100%', minHeight: 120, padding: '12px 14px', background: 'var(--field)', border: '1.5px solid var(--border-strong)', borderRadius: 14, resize: 'vertical', lineHeight: 1.5 }}
            />
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!draft.trim()} onClick={saveReply}>
              Post reply
            </button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
