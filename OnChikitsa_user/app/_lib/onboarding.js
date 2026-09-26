'use client';

// The single source of truth for "where should this user be right now?".
// Every entry point (splash, verify, dashboard guard) calls resolveRoute() and
// navigates to whatever it returns, so routing logic lives in exactly one place.
//
// Decision order: Firebase session → profile existence → native permission state
// → onboarding completion. A missing profile is NOT an error (routes to
// /register); genuine network/server errors throw so callers can retry.
import { getCurrentUser } from './auth';
import { userApi, ApiError } from './api';
import { checkLocationPermission, checkNotificationPermission } from './permissions';
import { flow } from './flow';

export const ROUTES = {
  welcome: '/welcome',
  register: '/register',
  location: '/location',
  notifications: '/notifications',
  dashboard: '/dashboard',
};

/**
 * Map the backend user document (source of truth) onto the local profile shape
 * the UI reads. Server `name` is split into first/last, `gender` lower-cased and
 * `dob` reduced to YYYY-MM-DD for the date input. Server values win where present
 * so returning users always see their real saved data; local-only fields (e.g. a
 * height not yet pushed) are preserved from `prev`.
 */
export function serverToLocalProfile(u, prev = {}) {
  if (!u) return prev;
  const name = (u.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  let dob = prev.dob || '';
  if (u.dob) { try { dob = new Date(u.dob).toISOString().slice(0, 10); } catch { /* keep prev */ } }
  return {
    ...prev,
    first: parts[0] || prev.first || '',
    last: parts.slice(1).join(' ') || prev.last || '',
    name: name || prev.name || '',
    email: u.email || prev.email || '',
    phone: u.phone || prev.phone || '',
    dob,
    gender: u.gender ? String(u.gender).toLowerCase() : (prev.gender || ''),
    height: (u.height ?? prev.height) ?? null,
    weight: (u.weight ?? prev.weight) ?? null,
  };
}

export async function resolveRoute() {
  // Fail-closed: if we can't confirm a Firebase session (no session, or the
  // native call errored), treat the user as logged out and send them to welcome
  // rather than letting them sit on a protected screen.
  let user = null;
  try { user = await getCurrentUser(); } catch { user = null; }
  if (!user) return ROUTES.welcome;

  let profile;
  try {
    profile = await userApi.getMe();
  } catch (err) {
    if (err instanceof ApiError && err.userNotFound) return ROUTES.register;
    throw err; // network / server / banned → let the caller decide
  }

  // Cache the DB profile into local state so every screen that reads
  // flow.getProfile() shows the real saved data (name, dob, gender, height…),
  // not just whatever was typed on this device.
  try { flow.setProfile(serverToLocalProfile(profile, flow.getProfile() || {})); } catch { /* ignore */ }

  // Existing account — walk the permission funnel, stopping only at a permission
  // the user hasn't decided yet. 'granted' and 'denied' are both final.
  if ((await checkLocationPermission()) === 'prompt') return ROUTES.location;
  if ((await checkNotificationPermission()) === 'prompt') return ROUTES.notifications;

  // Both permissions resolved → onboarding is complete. Mirror it server-side
  // once (best-effort: a write failure here must not trap the user out).
  if (profile && profile.onboardingStatus !== 'COMPLETED') {
    try {
      await userApi.updateMe({ onboardingStatus: 'COMPLETED' });
    } catch {
      /* ignore */
    }
  }
  return ROUTES.dashboard;
}
