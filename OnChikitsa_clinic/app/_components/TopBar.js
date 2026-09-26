'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from './icons';
import { tapLight } from '../_lib/haptic';

// Screen header with a working back button (also driven by the Android hardware
// back button via NativeShell). `right` is an optional action node.
export default function TopBar({ title, subtitle, onBack, right, solid = false, back = true }) {
  const router = useRouter();
  function goBack() {
    tapLight();
    if (onBack) onBack();
    else router.back();
  }
  return (
    <header className={`topbar ${solid ? 'solid' : ''}`}>
      {back ? (
        <button className="icon-back" aria-label="Go back" onClick={goBack}>
          <ArrowLeft size={20} />
        </button>
      ) : null}
      <div className="tb-title">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {right ? <div className="tb-right">{right}</div> : null}
    </header>
  );
}
