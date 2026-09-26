'use client';

// Native-first permission helpers for location and notifications. Every plugin
// import is dynamic + guarded behind isNative() so the static-export build never
// loads native-only code; the browser falls back to the Web APIs (and a stored
// decision) so `npm run dev` still exercises the flow.
//
// State is normalised to 'granted' | 'denied' | 'prompt'. Only 'prompt' (an
// undecided permission) should trigger a permission screen — 'granted' and
// 'denied' are both final and must never be re-nagged.
import { isNative } from './auth';

function normalize(state) {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt'; // 'prompt' | 'prompt-with-rationale' | undefined
}

function webState(flagKey) {
  try {
    const v = localStorage.getItem(flagKey);
    if (v === '1') return 'granted';
    if (v === '0') return 'denied';
  } catch {
    /* ignore */
  }
  return 'prompt';
}

function rememberWeb(flagKey, granted) {
  try {
    localStorage.setItem(flagKey, granted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

// A user's explicit decision, recorded locally so we never re-nag. This matters
// for "Skip": the OS permission stays 'prompt' (we never asked the OS), but the
// user HAS decided, so the guard must treat it as final rather than re-routing
// back to the permission screen. Pages call recordDecision() after acting.
const DECISION_KEYS = { location: 'perm_location_decided', notification: 'perm_notif_decided' };

export function recordDecision(kind, state) {
  try {
    localStorage.setItem(DECISION_KEYS[kind], state === 'granted' ? 'granted' : 'denied');
  } catch {
    /* ignore */
  }
}

function decidedState(kind) {
  try {
    const v = localStorage.getItem(DECISION_KEYS[kind]);
    if (v === 'granted') return 'granted';
    if (v === 'denied') return 'denied';
  } catch {
    /* ignore */
  }
  return 'prompt';
}

// ── Location ──────────────────────────────────────────────────────────────
// Wrap the plugin proxy in a plain object: resolving a promise with the proxy
// itself triggers a bogus native `.then()` call ("not implemented on android")
// that never settles. Destructure it out at the call site, never `await` it.
async function geo() {
  const { Geolocation } = await import('@capacitor/geolocation');
  return { Geolocation };
}

/** Silent check — never prompts. Safe to call from the routing guard. */
export async function checkLocationPermission() {
  if (await isNative()) {
    try {
      const { Geolocation } = await geo();
      const os = normalize((await Geolocation.checkPermissions()).location);
      if (os !== 'prompt') return os; // OS-level grant/denial is always final.
    } catch {
      /* fall through to the recorded decision */
    }
    // OS still undecided → honour the user's own recorded decision (e.g. Skip).
    return decidedState('location');
  }
  // Web has no silent geolocation check; rely on a previously stored decision.
  const web = webState('user_location_granted');
  return web !== 'prompt' ? web : decidedState('location');
}

/** Prompt for location; on grant, also read the current position. */
export async function requestLocation() {
  if (await isNative()) {
    const { Geolocation } = await geo();
    let status = await Geolocation.checkPermissions();
    if (normalize(status.location) === 'prompt') {
      status = await Geolocation.requestPermissions({ permissions: ['location'] });
    }
    const state = normalize(status.location);
    if (state !== 'granted') return { state };
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return { state, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } };
    } catch {
      return { state };
    }
  }
  // Web fallback via the browser geolocation prompt.
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      rememberWeb('user_location_granted', false);
      resolve({ state: 'denied' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        rememberWeb('user_location_granted', true);
        resolve({ state: 'granted', coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } });
      },
      () => {
        rememberWeb('user_location_granted', false);
        resolve({ state: 'denied' });
      },
      { timeout: 10000 },
    );
  });
}

// ── Notifications ───────────────────────────────────────────────────────────
async function push() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return { PushNotifications };
}

/** Silent check — never prompts. Safe to call from the routing guard. */
export async function checkNotificationPermission() {
  if (await isNative()) {
    try {
      const { PushNotifications } = await push();
      const os = normalize((await PushNotifications.checkPermissions()).receive);
      if (os !== 'prompt') return os; // OS-level grant/denial is always final.
    } catch {
      /* fall through to the recorded decision */
    }
    // OS still undecided → honour the user's own recorded decision (e.g. Skip).
    return decidedState('notification');
  }
  if (typeof Notification === 'undefined') {
    const web = webState('user_notif_granted');
    return web !== 'prompt' ? web : decidedState('notification');
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return decidedState('notification');
}

/** Prompt for notifications; on grant, register for push on native. */
export async function requestNotification() {
  if (await isNative()) {
    const { PushNotifications } = await push();
    let status = await PushNotifications.checkPermissions();
    if (normalize(status.receive) === 'prompt') {
      status = await PushNotifications.requestPermissions();
    }
    const state = normalize(status.receive);
    if (state === 'granted') {
      try {
        await PushNotifications.register();
      } catch {
        /* token registration is best-effort */
      }
    }
    return { state };
  }
  // Web fallback via the Notification API.
  try {
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      const p = await Notification.requestPermission();
      const granted = p === 'granted';
      rememberWeb('user_notif_granted', granted);
      return { state: granted ? 'granted' : 'denied' };
    }
  } catch {
    /* ignore */
  }
  rememberWeb('user_notif_granted', false);
  return { state: 'denied' };
}
