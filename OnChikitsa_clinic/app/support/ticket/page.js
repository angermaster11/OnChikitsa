'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Segmented from '../../_components/Segmented';
import { FileText, Upload, Send, Ticket, Image as ImageIcon, Clock, Cross, Download } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';
import { flow } from '../../_lib/flow';
import { supportApi, uploadToCloudinary } from '../../_lib/api';

const CATEGORIES = [
  { value: 'PAYMENTS', label: 'Payments' },
  { value: 'BOOKINGS', label: 'Bookings' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'OTHER', label: 'Other' },
];
const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];
const TICKET_BADGE = {
  OPEN:     { cls: 'badge-info',    label: 'Open' },
  PENDING:  { cls: 'badge-warning', label: 'In progress' },
  RESOLVED: { cls: 'badge-success', label: 'Resolved' },
  CLOSED:   { cls: 'badge-muted',   label: 'Closed' },
};
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

function labelOf(list, val) {
  const f = list.find((x) => x.value === val);
  return f ? f.label : (val ? val.charAt(0) + val.slice(1).toLowerCase() : '');
}
function isImageUrl(url) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url || '');
}
function fileName(url) {
  try { return decodeURIComponent((url || '').split('/').pop().split('?')[0]) || 'Attachment'; }
  catch { return 'Attachment'; }
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function SupportTicket() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [id, setId] = useState(null);
  const [ready, setReady] = useState(false); // URL parsed client-side

  // create-mode
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('PAYMENTS');
  const [priority, setPriority] = useState('MEDIUM');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState([]); // { key, name, size, status, pct, url, error }
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // thread-mode
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const mode = id ? 'thread' : 'create';

  // Auth gate — mirror the dashboard.
  useEffect(() => { if (!flow.isAuthed()) router.replace('/login'); }, [router]);

  // Read ?id= client-side (static export — no useSearchParams).
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id'));
    setReady(true);
  }, []);

  const loadTicket = useCallback(async (tid) => {
    setLoading(true); setLoadError('');
    try {
      const data = await supportApi.get(tid);
      setTicket(data);
    } catch (e) {
      setLoadError(e?.message || 'Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready && id && !ticket) loadTicket(id); }, [ready, id, ticket, loadTicket]);

  function pickFiles() { tapLight(); fileRef.current?.click(); }

  async function onFiles(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = '';
    if (!chosen.length) return;
    setFormError('');
    const room = MAX_FILES - files.length;
    if (room <= 0) { setFormError(`You can attach up to ${MAX_FILES} files.`); return; }
    for (const file of chosen.slice(0, room)) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (file.size > MAX_BYTES) {
        setFiles((p) => [...p, { key, name: file.name, size: file.size, status: 'error', pct: 0, error: 'Too large (max 5 MB)' }]);
        continue;
      }
      setFiles((p) => [...p, { key, name: file.name, size: file.size, status: 'uploading', pct: 0 }]);
      try {
        const url = await uploadToCloudinary(file, 'ticket', (pct) =>
          setFiles((p) => p.map((f) => (f.key === key ? { ...f, pct } : f))));
        setFiles((p) => p.map((f) => (f.key === key ? { ...f, status: 'done', pct: 100, url } : f)));
      } catch (err) {
        setFiles((p) => p.map((f) => (f.key === key ? { ...f, status: 'error', error: err?.message || 'Upload failed' } : f)));
      }
    }
  }

  function removeFile(key) { tapLight(); setFiles((p) => p.filter((f) => f.key !== key)); }

  async function submit() {
    if (submitting) return;
    const s = subject.trim();
    const m = desc.trim();
    if (!s) { setFormError('Please add a subject.'); return; }
    if (!m) { setFormError('Please describe your issue.'); return; }
    if (files.some((f) => f.status === 'uploading')) { setFormError('Please wait for attachments to finish uploading.'); return; }
    tapLight();
    setSubmitting(true); setFormError('');
    const attachments = files.filter((f) => f.status === 'done' && f.url).map((f) => f.url);
    try {
      const created = await supportApi.create({ subject: s, message: m, category, priority, attachments });
      const newId = created?._id;
      setTicket(created);
      setId(newId);
      if (newId) router.replace(`/support/ticket?id=${newId}`);
    } catch (e) {
      setFormError(e?.message || 'Could not raise the ticket. Please try again.');
      setSubmitting(false);
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || sending) return;
    tapLight();
    setSending(true); setLoadError('');
    try {
      const updated = await supportApi.respond(id, text);
      setTicket(updated);
      setReply('');
    } catch (e) {
      setLoadError(e?.message || 'Could not send your reply.');
    } finally {
      setSending(false);
    }
  }

  function renderCreate() {
    return (
      <>
        <div className="pad" style={{ paddingTop: 14 }}>
          <label className="field-label" htmlFor="subject" style={{ marginBottom: 8, display: 'block' }}>Subject</label>
          <div className="input-wrap">
            <input id="subject" className="input" placeholder="e.g. Payment PY-5010 stuck pending" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          </div>
        </div>
        <div className="pad" style={{ marginTop: 14 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Category</div>
          <Segmented options={CATEGORIES} value={category} onChange={setCategory} />
        </div>
        <div className="pad" style={{ marginTop: 14 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Priority</div>
          <Segmented options={PRIORITIES} value={priority} onChange={setPriority} />
        </div>
        <div className="pad" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="desc" style={{ marginBottom: 8, display: 'block' }}>Describe your issue</label>
          <textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Share the details, appointment / payment IDs and what you expected to happen."
            style={{ width: '100%', minHeight: 110, padding: 14, borderRadius: 14, background: 'var(--field)', border: '1.5px solid var(--border)', color: 'var(--fg)', fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div className="pad" style={{ marginTop: 8 }}>
          <button className="up-tile" style={{ width: '100%' }} onClick={pickFiles} aria-label="Add attachment" disabled={files.length >= MAX_FILES}>
            <Upload size={22} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)' }}>Add screenshot or file</span>
            <span className="ut-hint">PNG, JPG or PDF · up to 5 MB · {files.length}/{MAX_FILES}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={onFiles} style={{ display: 'none' }} />
        </div>
        {files.length > 0 && (
          <div className="pad stack" style={{ gap: 8, marginTop: 4 }}>
            {files.map((f) => (
              <div key={f.key} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <span className="thumb-ic accent" style={{ width: 40, height: 40, borderRadius: 12 }}>
                  {isImageUrl(f.url) ? <ImageIcon size={18} /> : <FileText size={18} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ display: 'block', fontSize: 12, marginTop: 2, color: f.status === 'error' ? 'var(--danger)' : 'var(--muted-fg)' }}>
                    {f.status === 'uploading' ? `Uploading… ${f.pct}%` : f.status === 'error' ? (f.error || 'Failed') : 'Attached'}
                  </span>
                </span>
                <button className="icon-btn" aria-label={`Remove ${f.name}`} onClick={() => removeFile(f.key)} style={{ flex: 'none' }}>
                  <Cross size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {formError && <div className="pad" style={{ marginTop: 10 }}><div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{formError}</div></div>}
        <div className="pad" style={{ marginTop: 16, marginBottom: 'calc(16px + var(--sab))' }}>
          <button className="btn btn-primary btn-block" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </>
    );
  }

  function renderThread() {
    if (loading && !ticket) return <div className="pad" style={{ paddingTop: 20, color: 'var(--muted-fg)', fontSize: 14 }}>Loading ticket…</div>;
    if (loadError && !ticket) return (
      <div className="pad" style={{ paddingTop: 20 }}>
        <div style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{loadError}</div>
        <button className="btn btn-outline btn-block" style={{ marginTop: 14 }} onClick={() => loadTicket(id)}>Try again</button>
      </div>
    );
    if (!ticket) return null;
    const b = TICKET_BADGE[ticket.status] || { cls: 'badge-muted', label: ticket.status };
    const responses = Array.isArray(ticket.responses) ? ticket.responses : [];
    const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
    const images = attachments.filter(isImageUrl);
    const docs = attachments.filter((u) => !isImageUrl(u));
    return (
      <>
        <div className="pad" style={{ paddingTop: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span className="thumb-ic accent"><Ticket size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{ticket.subject}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-fg)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} /> Opened {fmtDateTime(ticket.createdAt)}
                </div>
              </div>
              <span className={`badge ${b.cls}`}>{b.label}</span>
            </div>
            {(ticket.category || ticket.priority) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {ticket.category && <span className="chip chip-plain">{labelOf(CATEGORIES, ticket.category)}</span>}
                {ticket.priority && <span className="chip chip-plain">{labelOf(PRIORITIES, ticket.priority)} priority</span>}
              </div>
            )}
          </div>
        </div>

        <section className="section" style={{ marginTop: 6 }}><div className="section-head"><h2>Conversation</h2></div></section>
        <div className="chat">
          <div className="bubble me">
            {ticket.message}
            <span className="t">{fmtTime(ticket.createdAt)}</span>
          </div>
          {images.length > 0 && (
            <div style={{ alignSelf: 'flex-end', maxWidth: '78%', display: 'grid', gridTemplateColumns: images.length > 1 ? '1fr 1fr' : '1fr', gap: 6 }}>
              {images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" aria-label={`Open ${fileName(url)}`}
                  style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--field)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={fileName(url)} style={{ display: 'block', width: '100%', height: images.length > 1 ? 116 : 190, objectFit: 'cover' }} />
                </a>
              ))}
            </div>
          )}
          {docs.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" aria-label={`Open ${fileName(url)}`}
              style={{ alignSelf: 'flex-end', maxWidth: '82%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--fg)' }}>
              <span className="thumb-ic accent" style={{ width: 36, height: 36, borderRadius: 10 }}><FileText size={16} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName(url)}</span>
              <Download size={16} style={{ color: 'var(--muted-fg)', flex: 'none' }} />
            </a>
          ))}
          {responses.map((r, i) => {
            const mine = r.authorRole === 'CLINIC';
            return (
              <div key={i} className={`bubble ${mine ? 'me' : 'them'}`}>
                {!mine && r.authorName && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>{r.authorName}</span>}
                {r.message}
                <span className="t">{fmtTime(r.createdAt)}</span>
              </div>
            );
          })}
          {responses.length === 0 && (
            <span style={{ alignSelf: 'center', marginTop: 2, fontSize: 12.5, color: 'var(--muted-fg)' }}>Our team will reply here soon.</span>
          )}
        </div>

        <div className="grow" style={{ minHeight: 12 }} />
        {loadError && <div className="pad" style={{ paddingBottom: 6 }}><span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{loadError}</span></div>}
        <div style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px calc(10px + var(--sab))', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
          <div className="input-wrap" style={{ flex: 1, height: 48 }}>
            <input className="input" aria-label="Reply to support" placeholder="Type a reply" value={reply}
              onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }} />
          </div>
          <button className="btn btn-primary" style={{ minHeight: 48, minWidth: 48, padding: 0, borderRadius: 14 }}
            aria-label="Send reply" onClick={sendReply} disabled={!reply.trim() || sending}>
            <Send size={18} />
          </button>
        </div>
      </>
    );
  }

  if (!ready) {
    return (
      <Screen>
        <TopBar title="Support ticket" />
        <div className="content" />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={mode === 'create' ? 'Raise a ticket' : 'Support ticket'} />
      <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
        {mode === 'create' ? renderCreate() : renderThread()}
      </div>
    </Screen>
  );
}




