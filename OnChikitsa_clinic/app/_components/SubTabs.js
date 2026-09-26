'use client';

import { tapLight } from '../_lib/haptic';

// Segmented (pill) or underline sub-tabs. `tabs` accepts strings or {key,label}.
export default function SubTabs({ tabs, active, onChange, variant = 'seg' }) {
  const items = tabs.map((t) => (typeof t === 'string' ? { key: t, label: t } : t));
  const pick = (key) => { tapLight(); onChange?.(key); };
  const cls = variant === 'under' ? 'undernav' : 'subnav';
  const item = variant === 'under' ? 'utab' : 'seg';
  return (
    <div className={cls} role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={`${item} ${active === t.key ? 'active' : ''}`}
          onClick={() => pick(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
