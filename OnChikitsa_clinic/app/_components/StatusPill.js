'use client';

import { STATUS } from '../_lib/data';

// Maps an appointment / payment status key to a coloured badge.
export default function StatusPill({ status, label }) {
  const s = STATUS[status] || { label: label || status, cls: 'badge-muted' };
  return (
    <span className={`badge ${s.cls}`}>
      <span className="badge-dot" />
      {label || s.label}
    </span>
  );
}
