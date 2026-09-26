'use client';

import { useState } from 'react';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Segmented from '../../_components/Segmented';
import { FileText, Upload, Send } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';

const CATS = ['Payments', 'Bookings', 'Technical', 'Other'];

const SEED = [
  { id: 1, from: 'them', text: 'Hi! Thanks for reaching out to OnChikitsa support. Can you share the appointment or payment ID you need help with?', t: '10:02 AM' },
  { id: 2, from: 'me', text: 'Sure — payment PY-5010 for Amit Verma still shows pending.', t: '10:04 AM' },
  { id: 3, from: 'them', text: 'Thanks. That was a cash payment, so it stays pending until you mark it collected from the payment details screen. Want me to walk you through it?', t: '10:06 AM' },
];

export default function SupportTicket() {
  const [cat, setCat] = useState('Payments');
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(SEED);

  function send() {
    const text = msg.trim();
    if (!text) return;
    tapLight();
    const t = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: prev[prev.length - 1].id + 1, from: 'me', text, t }]);
    setMsg('');
  }

  return (
    <Screen>
      <TopBar title="Support Ticket" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="thumb-ic accent"><FileText size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Ticket TKT-2043</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 2 }}>Opened 23 Sep · 10:00 AM</div>
            </div>
            <span className="badge badge-warning"><span className="badge-dot" /> Open</span>
          </div>
        </div>

        <div className="pad" style={{ marginTop: 8 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Issue category</div>
          <Segmented options={CATS} value={cat} onChange={setCat} />
        </div>

        <div className="pad" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="desc" style={{ marginBottom: 8, display: 'block' }}>Describe your issue</label>
          <textarea
            id="desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Share the details, appointment / payment IDs and what you expected to happen."
            style={{ width: '100%', minHeight: 92, padding: 14, borderRadius: 14, background: 'var(--field)', border: '1.5px solid var(--border)', color: 'var(--fg)', fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div className="pad" style={{ marginTop: 4 }}>
          <button className="up-tile" style={{ width: '100%' }} onClick={() => tapLight()} aria-label="Add attachment">
            <Upload size={22} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)' }}>Add screenshot or file</span>
            <span className="ut-hint">PNG, JPG or PDF · up to 5 MB</span>
          </button>
        </div>

        <section className="section" style={{ marginTop: 6 }}><div className="section-head"><h2>Conversation</h2></div></section>
        <div className="chat">
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.from}`}>
              {m.text}
              <span className="t">{m.t}</span>
            </div>
          ))}
        </div>
        <div className="grow" style={{ minHeight: 12 }} />

        <div style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px calc(10px + var(--sab))', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
          <div className="input-wrap" style={{ flex: 1, height: 48 }}>
            <input
              className="input"
              aria-label="Message support"
              placeholder="Type a message"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ minHeight: 48, minWidth: 48, padding: 0, borderRadius: 14 }}
            aria-label="Send message"
            onClick={send}
            disabled={!msg.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </Screen>
  );
}
