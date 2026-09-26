'use client';

import { tapLight } from '../_lib/haptic';

// Numeric stepper with min/max clamping and an optional unit suffix.
export default function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }) {
  function set(v) {
    const n = Math.min(max, Math.max(min, v));
    if (n === value) return;
    tapLight();
    onChange?.(n);
  }
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" onClick={() => set(value - step)} disabled={value <= min}>−</button>
      <span className="sv">{value}{suffix ? ` ${suffix}` : ''}</span>
      <button type="button" aria-label="Increase" onClick={() => set(value + step)} disabled={value >= max}>+</button>
    </div>
  );
}
