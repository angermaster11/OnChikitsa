'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, LifeBuoy, CheckCircle, ArrowRight } from '../_components/icons';
import { resolveRoute } from '../_lib/onboarding';
import { getCurrentUser } from '../_lib/auth';
import { faqApi, supportApi } from '../_lib/api';
import styles from './support.module.css';

const SUBJECT_MAX = 160;
const MESSAGE_MAX = 5000;

export default function Support() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('faqs');

  // Same fast auth gate + onboarding guard as the rest of the app: bounce a
  // logged-out visitor to welcome before anything renders, and re-route anyone
  // who isn't a fully-onboarded user back to where they belong.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user = null;
      try { user = await getCurrentUser(); } catch { user = null; }
      if (cancelled) return;
      if (!user) { router.replace('/welcome'); return; }
      setChecking(false);
      try {
        const route = await resolveRoute();
        if (!cancelled && route !== '/dashboard') router.replace(route);
      } catch { /* offline → stay on the support screen */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (checking) return <main className={styles.screen} aria-busy="true" />;

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Support</h1>
      </header>
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'faqs'}
          className={`${styles.tab} ${tab === 'faqs' ? styles.tabOn : ''}`}
          onClick={() => setTab('faqs')}
        >
          FAQs
        </button>
        <button
          role="tab"
          aria-selected={tab === 'query'}
          className={`${styles.tab} ${tab === 'query' ? styles.tabOn : ''}`}
          onClick={() => setTab('query')}
        >
          Query
        </button>
      </div>

      {tab === 'faqs' ? <FaqsTab /> : <QueryTab />}
    </main>
  );
}

/** FAQs tab — question/answer accordion, curated from the admin panel. */
function FaqsTab() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await faqApi.list();
        if (!cancelled) setState({ loading: false, error: null, items: Array.isArray(items) ? items : [] });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message || 'Could not load FAQs.', items: [] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading) return <p className={styles.hint}>Loading FAQs…</p>;
  if (state.error) return <div className={styles.errorBox}>{state.error}</div>;
  if (state.items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}><LifeBuoy size={26} /></span>
        <p className={styles.emptyTitle}>No FAQs yet</p>
        <p className={styles.emptySub}>Frequently asked questions will show up here.</p>
      </div>
    );
  }

  return (
    <div className={styles.faqList}>
      {state.items.map((f) => {
        const isOpen = open === f._id;
        return (
          <div key={f._id} className={`${styles.faqItem} ${isOpen ? styles.faqItemOn : ''}`}>
            <button className={styles.faqQ} onClick={() => setOpen(isOpen ? null : f._id)} aria-expanded={isOpen}>
              <span className={styles.faqQText}>{f.question}</span>
              <ChevronDown size={20} className={`${styles.faqChev} ${isOpen ? styles.faqChevOn : ''}`} />
            </button>
            {isOpen && <p className={styles.faqA}>{f.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Query tab — raise a support ticket (subject + message → POST /user/support). */
function QueryTab() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const valid = subject.trim().length >= 1 && message.trim().length >= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await supportApi.create({ subject: subject.trim(), message: message.trim() });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not send your query. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}><CheckCircle size={30} /></span>
        <p className={styles.successTitle}>Query sent</p>
        <p className={styles.successSub}>We&apos;ll reply in Messages — you&apos;ll find this query and its responses there as a chat.</p>
        <button className={styles.successBtn} onClick={() => router.push('/messages')}>View in Messages</button>
        <button
          className={styles.successBtnAlt}
          onClick={() => { setDone(false); setSubject(''); setMessage(''); }}
        >
          Send another
        </button>
      </div>
    );
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.formLead}>Have a question or an issue? Send us a message and we&apos;ll help you out.</p>
      {error && <div className={styles.errorBox}>{error}</div>}
      <label className={styles.field}>
        <span className={styles.label}>Subject</span>
        <input
          className={styles.input}
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is it about?"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Message</span>
        <textarea
          className={styles.textarea}
          rows={6}
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your query in a few lines…"
        />
      </label>
      <button type="submit" className={styles.send} disabled={!valid || busy}>
        {busy ? 'Sending…' : <>Send <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
