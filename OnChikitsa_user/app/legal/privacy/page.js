'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '../../_components/icons';
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
    <main style={{ padding: '20px', minHeight: '100dvh', background: '#f8f9fa' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingTop: 'env(safe-area-inset-top)' }}>
        <button
          onClick={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0e0e12' }}>Privacy Policy</h1>
      </header>
      {busy ? (
        <p style={{ color: '#666' }}>Loading...</p>
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.7, color: '#1a1d29', whiteSpace: 'pre-wrap', background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {content || 'No content available yet.'}
        </div>
      )}
    </main>
  );
}
