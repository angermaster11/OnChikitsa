'use client';

// Initials or photo circle, optional presence dot. size: 40 | 46 | 56 | 72.
function initials(name = '') {
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function Avatar({ name = '', src, size = 46, square = false, status }) {
  return (
    <span className={`av av-${size} ${square ? 'sq' : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
      {status ? <span className={`av-dot ${status === 'off' ? 'off' : ''}`} /> : null}
    </span>
  );
}
