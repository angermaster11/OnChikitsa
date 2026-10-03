'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';
import { legalApi } from '../../_lib/api';

export default function PrivacyPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    legalApi.get().then((data) => {
      setContent(data.privacyPolicy);
      setBusy(false);
    }).catch(() => {
      setContent('Content is currently unavailable.');
      setBusy(false);
    });
  }, []);

  return (
    <main style={{ padding: '20px', minHeight: '100dvh', background: '#fff' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => { tapLight(); router.back(); }}
          style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'var(--bg-sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
      </header>
      {busy ? (
        <p style={{ color: 'var(--ink-sub)' }}>Loading...</p>
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
          {content || 'No content provided.'}
        </div>
      )}
    </main>
  );
}
