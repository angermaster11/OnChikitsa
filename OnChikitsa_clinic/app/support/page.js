'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import EmptyState from '../_components/EmptyState';
import {
  Search, ChevronDown, ChevronUp, Phone, Mail, MessageCircle,
  HelpCircle, ChevronRight, Plus,
} from '../_components/icons';
import { CLINIC } from '../_lib/data';
import { tapLight } from '../_lib/haptic';

const FAQS = [
  { q: 'How do I add a new doctor?', a: 'Go to More → Doctors → Add doctor, fill in the specialization, qualification, consultation fee and schedule, then tap Save.' },
  { q: 'How does the token queue work?', a: 'Open the Queue tab to call the next patient, mark arrivals, recall a token and complete consultations in real time. Tokens look like A-12.' },
  { q: 'When are online payments settled?', a: 'Online payments settle to your registered bank account within 2 working days. Track each payout under Earnings → Settlements.' },
  { q: 'How do I change my working hours?', a: 'Update clinic hours under Settings → Booking settings, or set a specific doctor’s availability under Schedule.' },
  { q: 'How are cancellations and refunds handled?', a: 'Refunds follow the cancellation policy in Settings. Approved refunds reach the patient in 5–7 working days.' },
  { q: 'How do I get my clinic verified?', a: 'Upload your registration and license documents during setup. Our team reviews them within 24–48 hours and marks your clinic Verified.' },
];

export default function Support() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(0);

  const query = q.trim().toLowerCase();
  const faqs = query
    ? FAQS.filter((f) => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query))
    : FAQS;

  const contact = [
    { Icon: Phone, t: 'Call us', v: CLINIC.phone, onClick: () => { tapLight(); window.location.href = `tel:${CLINIC.phone.replace(/\s/g, '')}`; } },
    { Icon: Mail, t: 'Email support', v: CLINIC.email, onClick: () => { tapLight(); window.location.href = `mailto:${CLINIC.email}`; } },
    { Icon: MessageCircle, t: 'Live chat', v: 'Online now', onClick: () => { tapLight(); router.push('/support/ticket'); } },
  ];

  return (
    <Screen>
      <TopBar title="Help & Support" />
      <div className="content">
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Search help articles"
            placeholder="Search help articles"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <section className="section"><div className="section-head"><h2>FAQs</h2></div></section>
        <div className="pad stack" style={{ gap: 10 }}>
          {faqs.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={26} />}
              title="No results"
              hint={`Nothing matches “${q}”. Try different keywords or contact support below.`}
            />
          ) : (
            faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="card" style={{ overflow: 'hidden' }}>
                  <button
                    onClick={() => { tapLight(); setOpen(isOpen ? -1 : i); }}
                    aria-expanded={isOpen}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 16, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--fg)' }}
                  >
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{f.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen ? (
                    <p style={{ padding: '0 16px 16px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted-fg)' }}>{f.a}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <section className="section"><div className="section-head"><h2>Contact support</h2></div></section>
        <div className="set-group">
          {contact.map(({ Icon, t, v, onClick }) => (
            <button key={t} className="set-row" onClick={onClick}>
              <span className="sr-ic"><Icon size={18} /></span>
              <span className="sr-t">{t}</span>
              <span className="sr-v">{v}</span>
              <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
            </button>
          ))}
        </div>

        <div className="pad" style={{ marginTop: 16, marginBottom: 10 }}>
          <button className="btn btn-primary btn-block" onClick={() => { tapLight(); router.push('/support/ticket'); }}>
            <Plus size={18} /> Raise a ticket
          </button>
        </div>
      </div>
    </Screen>
  );
}
