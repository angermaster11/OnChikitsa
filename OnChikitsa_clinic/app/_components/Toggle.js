'use client';

import { tapLight } from '../_lib/haptic';

// Accessible on/off switch.
export default function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={!!on}
      aria-label={label || 'Toggle'}
      onClick={() => { tapLight(); onChange?.(!on); }}
    />
  );
}
