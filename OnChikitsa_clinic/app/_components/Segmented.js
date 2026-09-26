'use client';

import { tapLight } from '../_lib/haptic';

// Inline segmented control. `options` accepts strings or {value,label}.
export default function Segmented({ options, value, onChange }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className="seg-ctrl" role="group">
      {items.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'on' : ''}
          aria-pressed={value === o.value}
          onClick={() => { tapLight(); onChange?.(o.value); }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
