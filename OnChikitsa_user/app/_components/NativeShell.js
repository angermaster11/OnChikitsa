'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isNative } from '../_lib/auth';
import { deviceApi } from '../_lib/api';

const EXIT_ROUTES = new Set(['/', '/welcome', '/dashboard']);

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

  useEffect(() => {
    let cancelled = false;
    let backSub;
    (async () => {
      if (!(await isNative())) return;

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.addListener('registration', (token) => {
          deviceApi.register(token.value, 'android').catch(() => {});
        });
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const route = action.notification.data?.route;
          if (route) window.location.href = route;
        });
      } catch { /* ignore */ }

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await isNative())) return;
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
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
