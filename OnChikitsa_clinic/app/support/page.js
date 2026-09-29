'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../_components/Screen';
import TopBar from '../_components/TopBar';
import EmptyState from '../_components/EmptyState';
import {
  Search, ChevronDown, ChevronUp, Phone, Mail,
  HelpCircle, ChevronRight, Plus, Ticket,
} from '../_components/icons';
import { tapLight } from '../_lib/haptic';
import { flow } from '../_lib/flow';
import { supportApi } from '../_lib/api';

// Backend ticket status → badge class + label (StatusPill has no ticket keys).
const TICKET_BADGE = {
  OPEN:     { cls: 'badge-info',    label: 'Open' },
  PENDING:  { cls: 'badge-warning', label: 'In progress' },
  RESOLVED: { cls: 'badge-success', label: 'Resolved' },
  CLOSED:   { cls: 'badge-muted',   label: 'Closed' },
};

const SUPPORT_PHONE = '+91 88888 00000';
const SUPPORT_EMAIL = 'clinic-support@onchikitsa.com';

const FAQS = [
  { q: 'How do I add a new doctor?', a: 'Go to More → Doctors → Add doctor, fill in the specialization, qualification, consultation fee and schedule, then tap Save.' },
  { q: 'How does the token queue work?', a: 'Open the Queue tab to call the next patient, mark arrivals, recall a token and complete consultations in real time. Tokens look like A-12.' },
  { q: 'When are online payments settled?', a: 'Online payments settle to your registered bank account within 2 working days. Track each payout under Earnings → Settlements.' },
  { q: 'How do I change my working hours?', a: 'Update clinic hours under Settings → Booking settings, or set a specific doctor’s availability under Schedule.' },
  { q: 'How are cancellations and refunds handled?', a: 'Refunds follow the cancellation policy in Settings. Approved refunds reach the patient in 5–7 working days.' },
  { q: 'How do I get my clinic verified?', a: 'Upload your registration and license documents during setup. Our team reviews them within 24–48 hours and marks your clinic Verified.' },
];

/** ISO date → "27 Sep". */
function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

export default function Support() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth gate — mirror the dashboard.
  useEffect(() => { if (!flow.isAuthed()) router.replace('/login'); }, [router]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await supportApi.listMine();
      setTickets(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setError(e?.message || 'Could not load your tickets.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (flow.isAuthed()) load(); }, [load]);

  const query = q.trim().toLowerCase();
  const faqs = query
    ? FAQS.filter((f) => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query))
    : FAQS;

  const contact = [
    { Icon: Phone, t: 'Call us', v: SUPPORT_PHONE, onClick: () => { tapLight(); window.location.href = `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`; } },
    { Icon: Mail, t: 'Email support', v: SUPPORT_EMAIL, onClick: () => { tapLight(); window.location.href = `mailto:${SUPPORT_EMAIL}`; } },
  ];

  return (
    <Screen>
      <TopBar title="Help & Support" />
      <div className="content">
        <section className="section">
          <div className="section-head">
            <h2>My tickets</h2>
            <button className="link" onClick={() => { tapLight(); router.push('/support/ticket'); }}>
              <Plus size={15} /> New
            </button>
          </div>
        </section>
        <div className="pad stack" style={{ gap: 10 }}>
          {loading && <div className="card" style={{ padding: 16, fontSize: 13.5, color: 'var(--muted-fg)' }}>Loading your tickets…</div>}
          {!loading && error && <div className="card" style={{ padding: 16, fontSize: 13.5, color: 'var(--danger)' }}>{error}</div>}
          {!loading && !error && tickets.length === 0 && (
            <EmptyState icon={<Ticket size={26} />} title="No tickets yet" hint="Raise a ticket and our team will help you out." />
          )}
          {!loading && !error && tickets.map((t) => {
            const b = TICKET_BADGE[t.status] || { cls: 'badge-muted', label: t.status };
            const sub = [t.category ? titleCase(t.category) : '', shortDate(t.updatedAt)].filter(Boolean).join(' · ');
            return (
              <button key={t._id} className="card" onClick={() => { tapLight(); router.push(`/support/ticket?id=${t._id}`); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}>
                <span className="thumb-ic accent"><Ticket size={20} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                  {sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 2 }}>{sub}</span>}
                </span>
                <span className={`badge ${b.cls}`}>{b.label}</span>
                <ChevronRight size={18} style={{ color: 'var(--faint-fg)', flex: 'none' }} />
              </button>
            );
          })}
        </div>

        <section className="section"><div className="section-head"><h2>FAQs</h2></div></section>
        <div className="search">
          <Search size={18} />
          <input aria-label="Search help articles" placeholder="Search help articles" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="pad stack" style={{ gap: 10 }}>
          {faqs.length === 0 ? (
            <EmptyState icon={<HelpCircle size={26} />} title="No results" hint={`Nothing matches “${q}”. Try different keywords or contact support below.`} />
          ) : (
            faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="card" style={{ overflow: 'hidden' }}>
                  <button onClick={() => { tapLight(); setOpen(isOpen ? -1 : i); }} aria-expanded={isOpen}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 16, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--fg)' }}>
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{f.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen ? <p style={{ padding: '0 16px 16px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted-fg)' }}>{f.a}</p> : null}
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
