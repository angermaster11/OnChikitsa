'use client';

// Native-shell glue that makes the Capacitor build behave like a real Android
// app instead of a web page in a frame: it owns the hardware BACK button and the
// status-bar contrast. Everything is guarded behind isNative() and dynamically
// imported, so the static-export prerender (and the browser) never touch native
// plugins. Renders nothing except a transient "press back again to exit" toast.
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isNative } from '../_lib/auth';

// Entry / home screens: hardware-back should EXIT the app (double-press), never
// walk back into the web history — that's the native convention for a root.
const EXIT_ROUTES = new Set(['/', '/welcome', '/dashboard']);

// Screens whose top strip is a coloured (blue) hero → status-bar icons must be
// light. Everything else has a white top → dark icons. The bar overlays the page
// (transparent), matching the app's safe-area layout.
const LIGHT_ICON_ROUTES = new Set([
  '/welcome', '/login', '/verify', '/register', '/details', '/location', '/notifications',
]);

function currentPath() {
  if (typeof window === 'undefined') return '/';
  const p = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/+$/, '');
  return p || '/';
}

export default function NativeShell() {
  const pathname = usePathname();
  const [exitHint, setExitHint] = useState(false);
  const backArmed = useRef(false);

  // One-time: draw under the status bar (edge-to-edge) + own the back button.
  useEffect(() => {
    let cancelled = false;
    let backSub;
    (async () => {
      if (!(await isNative())) return;
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch { /* plugin absent → skip */ }
      try {
        const { App } = await import('@capacitor/app');
        const sub = await App.addListener('backButton', ({ canGoBack }) => {
          if (!EXIT_ROUTES.has(currentPath()) && canGoBack) {
            window.history.back();
            return;
          }
          if (backArmed.current) { App.exitApp(); return; }
          backArmed.current = true;
          setExitHint(true);
          setTimeout(() => { backArmed.current = false; setExitHint(false); }, 2000);
        });
        if (cancelled) sub.remove(); else backSub = sub;
      } catch { /* plugin absent → skip */ }
    })();
    return () => { cancelled = true; if (backSub) backSub.remove(); };
  }, []);

  // Per-route status-bar icon contrast.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await isNative())) return;
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Style.Dark = light icons (for dark/colour tops); Style.Light = dark icons.
        const style = LIGHT_ICON_ROUTES.has(currentPath()) ? Style.Dark : Style.Light;
        if (!cancelled) await StatusBar.setStyle({ style });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  if (!exitHint) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed', left: '50%', bottom: 'calc(30px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none',
        background: 'rgba(20, 22, 34, 0.92)', color: '#fff', padding: '11px 20px',
        borderRadius: '999px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
      }}
    >
      Press back again to exit
    </div>
  );
}
