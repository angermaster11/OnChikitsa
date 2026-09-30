'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, AlertCircle, Plus } from '../_components/icons';
import { getCurrentUser } from '../_lib/auth';
import { supportApi, ApiError } from '../_lib/api';
import styles from './messages.module.css';

// Ticket status → a friendly label + pill tint.
const STATUS = {
  OPEN: { label: 'Open', cls: 'open' },
  PENDING: { label: 'Replied', cls: 'replied' },
  RESOLVED: { label: 'Resolved', cls: 'resolved' },
  CLOSED: { label: 'Closed', cls: 'closed' },
};
// A response authored with the USER role is "mine"; anything else is support staff.
const isMine = (role) => role === 'USER';

function timeLabel(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? t : `${d.getDate()}/${d.getMonth() + 1} · ${t}`;
}

export default function Messages() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thread, setThread] = useState(null);   // the open ticket (with responses[])
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const items = await supportApi.listMine();
      setTickets(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      await loadList();
    })();
    return () => { cancelled = true; };
  }, [router, loadList]);

  const openThread = async (id) => {
    setThreadLoading(true); setError('');
    try {
      const t = await supportApi.get(id);
      setThread(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open this conversation.');
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    const msg = reply.trim();
    if (!msg || sending || !thread) return;
    setSending(true);
    try {
      const updated = await supportApi.respond(thread._id, msg);
      setThread(updated);
      setReply('');
      loadList(); // refresh the list preview/status
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your reply.');
    } finally {
      setSending(false);
    }
  };

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  // ---- Thread (chat) view ----
  if (thread) {
    const st = STATUS[thread.status] || { label: thread.status, cls: 'open' };
    const bubbles = [
      { me: true, who: 'You', text: thread.message, at: thread.createdAt },
      ...(thread.responses || []).map((r) => ({
        me: isMine(r.authorRole), who: isMine(r.authorRole) ? 'You' : (r.authorName || 'Support'), text: r.message, at: r.createdAt,
      })),
    ];
    return (
      <main className={styles.screen}>
        <header className={styles.head}>
          <button className={styles.back} aria-label="Back" onClick={() => { setThread(null); setReply(''); }}><ArrowLeft size={22} /></button>
          <div className={styles.headMid}>
            <h1 className={styles.threadTitle}>{thread.subject}</h1>
            <span className={`${styles.pill} ${styles['p_' + st.cls]}`}>{st.label}</span>
          </div>
        </header>

        <div className={styles.chat}>
          {bubbles.map((b, i) => (
            <div key={i} className={`${styles.row} ${b.me ? styles.mine : styles.them}`}>
              <div className={styles.bubble}>
                {!b.me && <span className={styles.who}>{b.who}</span>}
                <p className={styles.bubbleText}>{b.text}</p>
                <span className={styles.bubbleTime}>{timeLabel(b.at)}</span>
              </div>
            </div>
          ))}
          {error && <p className={styles.chatErr}>{error}</p>}
        </div>

        <div className={styles.composer}>
          <input
            className={styles.input}
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
          />
          <button className={styles.send} disabled={!reply.trim() || sending} onClick={sendReply}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </main>
    );
  }

  // ---- List view ----
  const preview = (t) => {
    const r = t.responses && t.responses.length ? t.responses[t.responses.length - 1] : null;
    return r ? r.message : t.message;
  };
  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <button className={styles.back} aria-label="Back" onClick={() => router.push('/profile')}><ArrowLeft size={22} /></button>
        <h1 className={styles.title}>Messages</h1>
        <button className={styles.newBtn} onClick={() => router.push('/support')}><Plus size={18} /> New</button>
      </header>

      {loading || threadLoading ? (
        <p className={styles.loadTxt}>Loading…</p>
      ) : error ? (
        <Empty icon={<AlertCircle size={26} />} title="Couldn’t load messages" sub={error} danger />
      ) : tickets.length === 0 ? (
        <Empty icon={<MessageCircle size={26} />} title="No messages yet" sub="Raise a query and the replies will appear here as a chat." />
      ) : (
        <div className={styles.list}>
          {tickets.map((t) => {
            const st = STATUS[t.status] || { label: t.status, cls: 'open' };
            return (
              <button key={t._id} className={styles.card} onClick={() => openThread(t._id)}>
                <span className={styles.cardIcon}><MessageCircle size={20} /></span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTop}>
                    <span className={styles.cardSubject}>{t.subject}</span>
                    <span className={styles.cardTime}>{timeLabel(t.updatedAt || t.createdAt)}</span>
                  </span>
                  <span className={styles.cardPreview}>{preview(t)}</span>
                  <span className={`${styles.pill} ${styles['p_' + st.cls]}`}>{st.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Empty({ icon, title, sub, danger }) {
  return (
    <div className={styles.empty}>
      <span className={`${styles.emptyIcon} ${danger ? styles.emptyDanger : ''}`}>{icon}</span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySub}>{sub}</p>
    </div>
  );
}


