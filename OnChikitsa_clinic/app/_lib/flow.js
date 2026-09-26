'use client';

// Client-side flow state (no backend yet). All reads are guarded so the static
// export renders safely on the server / first paint.
const KEYS = {
  onboarded: 'clinic_onboarded',
  authed: 'clinic_authed',
  setup: 'clinic_setup_done',
  phone: 'clinic_phone',
  clinic: 'clinic_profile',
};

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function del(key) {
  try { localStorage.removeItem(key); } catch {}
}

export const flow = {
  isOnboarded: () => read(KEYS.onboarded) === '1',
  setOnboarded: () => write(KEYS.onboarded, '1'),

  isAuthed: () => read(KEYS.authed) === '1',
  setAuthed: () => write(KEYS.authed, '1'),

  isClinicSetup: () => read(KEYS.setup) === '1',
  setClinicSetup: () => write(KEYS.setup, '1'),

  getPhoneParts: () => {
    try { return JSON.parse(read(KEYS.phone)) || { dial: '+91', number: '' }; }
    catch { return { dial: '+91', number: '' }; }
  },
  setPhone: (dial, number) => write(KEYS.phone, JSON.stringify({ dial, number })),

  getClinic: () => {
    try { return JSON.parse(read(KEYS.clinic)) || null; } catch { return null; }
  },
  setClinic: (c) => write(KEYS.clinic, JSON.stringify({ ...(flow.getClinic() || {}), ...c })),

  // Clear every local flag/profile so a fresh sign-in re-resolves cleanly.
  // (The Firebase session itself is ended by auth.signOut() at the call site,
  // and the API profile cache by api.invalidateMe().)
  logout: () => { del(KEYS.authed); del(KEYS.phone); del(KEYS.clinic); del(KEYS.setup); },

  // Where should the splash send the user?
  entryRoute: () => {
    if (!flow.isOnboarded()) return '/onboarding';
    if (!flow.isAuthed()) return '/login';
    if (!flow.isClinicSetup()) return '/setup/clinic';
    return '/dashboard';
  },
};
