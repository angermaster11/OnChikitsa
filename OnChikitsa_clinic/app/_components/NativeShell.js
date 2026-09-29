'use client';

// Owns all native behaviour so the app never feels like a web wrapper. Mounted
// once in app/layout.js. Everything is guarded by isNativePlatform() + dynamic
// import() so the static web build renders untouched.
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Screens where hardware-back should EXIT the app instead of navigating: the
// authed home, and the unauth entry screens (there is nothing sensible behind
// them — going "back" used to bounce through /dashboard and flicker).
const ROOT_SCREENS = ['/dashboard', '/login', '/onboarding', '/'];
// The five bottom-nav roots. Back on a non-home tab jumps to home.
const TAB_ROOTS = ['/dashboard', '/appointments', '/queue', '/patients', '/more'];
const HOME = '/dashboard';

function norm(p) {
  if (!p) return '/';
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

export default function NativeShell() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(norm(pathname));
  const lastBack = useRef(0);
  const [exitHint, setExitHint] = useState(false);

  useEffect(() => { pathRef.current = norm(pathname); }, [pathname]);

  useEffect(() => {
    let removeBack = () => {};
    let cancelled = false;
    let Cap = null;

    (async () => {
      try { ({ Capacitor: Cap } = await import('@capacitor/core')); } catch { return; }
      if (!Cap?.isNativePlatform?.()) return;

      // Status bar — brand green with light-mode styling. The app is light-only,
      // so this no longer follows the OS color scheme.
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        try {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#00cfba' });
        } catch {}
      } catch {}

      // Hide the native splash once the web layer has painted.
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {}

      // Hardware back button — the core of the native feel.
      try {
        const { App } = await import('@capacitor/app');
        const sub = await App.addListener('backButton', ({ canGoBack }) => {
          // 1) An open bottom sheet / modal swallows back — close it, don't
          //    navigate. Every modal in the app is the shared <Sheet> (its
          //    scrim closes it on tap), so one selector covers them all.
          const scrim = document.querySelector('.sheet-scrim');
          if (scrim) { scrim.click(); return; }

          const path = pathRef.current;

          // 2) Root screens → press back twice to leave the app.
          if (ROOT_SCREENS.includes(path)) {
            const now = Date.now();
            if (now - lastBack.current < 2000) { App.exitApp(); return; }
            lastBack.current = now;
            setExitHint(true);
            setTimeout(() => setExitHint(false), 2000);
            import('../_lib/haptic').then((h) => h.tapLight()).catch(() => {});
            return;
          }

          // 3) A non-home tab root → go to home.
          if (TAB_ROOTS.includes(path)) { router.push(HOME); return; }

          // 4) Everything else → normal back; fall back to home if the history
          //    stack is empty (e.g. a deep-linked / reloaded screen).
          if (canGoBack) router.back(); else router.push(HOME);
        });
        if (cancelled) sub.remove(); else removeBack = () => sub.remove();
      } catch {}
    })();

    return () => { cancelled = true; removeBack(); };
  }, [router]);

  if (!exitHint) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', left: '50%', bottom: 'calc(28px + var(--sab))', transform: 'translateX(-50%)',
      zIndex: 60, background: 'rgba(15,22,38,0.92)', color: '#fff', fontSize: 13, fontWeight: 600,
      padding: '10px 18px', borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none',
    }}>Press back again to exit</div>
  );
}
