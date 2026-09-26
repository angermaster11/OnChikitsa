'use client';

import { useEffect } from 'react';

// Bottom-sheet modal for filters, confirmations and pickers.
export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title || 'Options'}>
        <div className="grab" />
        {title ? <h2 style={{ marginBottom: 14 }}>{title}</h2> : null}
        {children}
      </div>
    </>
  );
}
