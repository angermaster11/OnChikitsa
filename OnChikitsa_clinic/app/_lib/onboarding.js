'use client';

// The single source of truth for "where should this clinic be right now?".
// The splash and the auth screens call resolveRoute() and navigate to whatever
// it returns, so routing logic lives in exactly one place.
//
// Decision order: Firebase session → clinic profile existence → notification
// permission → dashboard. A missing profile is NOT an error (routes to
// /setup/clinic); genuine network/server errors throw so callers can retry.
import { getCurrentUser } from './auth';
import { clinicApi, ApiError } from './api';
import { checkNotificationPermission } from './permissions';
import { flow } from './flow';

export const ROUTES = {
  onboarding: '/onboarding',
  login: '/login',
  setupClinic: '/setup/clinic',
  notifications: '/setup/notifications',
  dashboard: '/dashboard',
};

/**
 * Map the backend clinic document (source of truth) onto the local profile
 * shape the UI reads, so every screen that calls flow.getClinic() shows the
 * real saved data — not just whatever was typed on this device.
 */
export function serverToLocalClinic(c, prev = {}) {
  if (!c) return prev;
  return {
    ...prev,
    id: c._id || c.id || prev.id || '',
    name: c.name || prev.name || '',
    phone1: c.phone1 || prev.phone1 || '',
    phone2: c.phone2 || prev.phone2 || '',
    email: c.email || prev.email || '',
    yearsOld: c.yearsOld ?? prev.yearsOld ?? null,
    description: c.description || prev.description || '',
    specialties: Array.isArray(c.specialties) ? c.specialties : (prev.specialties || []),
    address: c.address || prev.address || null,
    location: c.location || prev.location || null,
    consultationFee: c.consultationFee ?? prev.consultationFee ?? null,
    averageConsultationTime: c.averageConsultationTime ?? prev.averageConsultationTime ?? null,
    logo: c.logo || prev.logo || '',
    banner: c.banner || prev.banner || '',
    status: c.status || prev.status || 'ACTIVE',
  };
}

export async function resolveRoute() {
  // Fail-closed: if we can't confirm a Firebase session (none, or the native
  // call errored), treat the clinic as logged out and send them to login
  // rather than letting them sit on a protected screen.
  let user = null;
  try { user = await getCurrentUser(); } catch { user = null; }
  if (!user) return ROUTES.login;

  let profile;
  try {
    profile = await clinicApi.getMe();
  } catch (err) {
    if (err instanceof ApiError && err.clinicNotFound) return ROUTES.setupClinic;
    throw err; // network / server / banned → let the caller decide
  }

  // Mirror the DB profile into local state + mark setup done for fast routing.
  try {
    flow.setClinic(serverToLocalClinic(profile, flow.getClinic() || {}));
    flow.setClinicSetup();
  } catch { /* ignore */ }

  // Existing account — the only remaining funnel gate is notifications.
  // 'granted' and 'denied' are both final; only an undecided 'prompt' stops here.
  if ((await checkNotificationPermission()) === 'prompt') return ROUTES.notifications;
  return ROUTES.dashboard;
}
