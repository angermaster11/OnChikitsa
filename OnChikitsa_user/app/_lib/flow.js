'use client';

// Lightweight client-side flow state (no backend yet). All reads are guarded so
// the static export renders safely on the server / first paint.
const KEYS = {
  onboarded: 'onchikitsa_onboarded',
  authed: 'onchikitsa_authed',
  phone: 'onchikitsa_phone',
  profile: 'onchikitsa_profile',
  location: 'onchikitsa_location',
  clinic: 'onchikitsa_clinic',
  bookings: 'onchikitsa_bookings',
  readNotifs: 'onchikitsa_read_notifs',
};

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export const flow = {
  isOnboarded: () => read(KEYS.onboarded) === '1',
  setOnboarded: () => write(KEYS.onboarded, '1'),

  isAuthed: () => read(KEYS.authed) === '1',
  setAuthed: () => write(KEYS.authed, '1'),

  getPhone: () => read(KEYS.phone) || '',
  setPhone: (dial, number) => write(KEYS.phone, JSON.stringify({ dial, number })),
  getPhoneParts: () => {
    try { return JSON.parse(read(KEYS.phone)) || { dial: '+91', number: '' }; }
    catch { return { dial: '+91', number: '' }; }
  },

  getProfile: () => {
    try { return JSON.parse(read(KEYS.profile)) || null; } catch { return null; }
  },
  setProfile: (p) => write(KEYS.profile, JSON.stringify(p)),

  // Chosen delivery/search location shown on the dashboard header. Empty → the
  // dashboard falls back to the generic "Current location" label.
  getLocation: () => read(KEYS.location) || '',
  setLocation: (label) => write(KEYS.location, label || ''),

  // Which clinic the Explore list tapped into — the detail screen reads it back
  // (query-string-free so it survives Capacitor's static file serving).
  getClinicId: () => read(KEYS.clinic) || '',
  setClinicId: (id) => write(KEYS.clinic, id || ''),

  // Bookings the user made from the clinic screen (front-end only — no booking
  // backend yet). Newest first; a "live" booking carries the queue fields shown
  // on the Bookings screen. Capped so localStorage never grows unbounded.
  getBookings: () => {
    try { return JSON.parse(read(KEYS.bookings)) || []; } catch { return []; }
  },
  addBooking: (b) => {
    try {
      const list = flow.getBookings();
      list.unshift(b);
      write(KEYS.bookings, JSON.stringify(list.slice(0, 30)));
    } catch {}
  },

  // Ids of notifications the user has already seen — so the bell's unread dot and
  // the Notifications screen stay in sync across visits. Capped so it can't grow
  // unbounded. Notifications themselves are generated fresh (see _lib/notifications).
  getReadNotifs: () => {
    try { return JSON.parse(read(KEYS.readNotifs)) || []; } catch { return []; }
  },
  markNotifsRead: (ids) => {
    try {
      const set = new Set([...flow.getReadNotifs(), ...ids]);
      write(KEYS.readNotifs, JSON.stringify([...set].slice(-100)));
    } catch {}
  },

  // Clear the local session on logout. The real auth is Firebase (signOut()
  // handles that); this just drops the local flags so the splash/guards don't
  // send a logged-out user straight back into the app. Chosen location is kept.
  signOut: () => {
    remove(KEYS.authed);
    remove(KEYS.phone);
    remove(KEYS.profile);
    remove(KEYS.bookings);
    remove(KEYS.readNotifs);
  },

  // Where should the splash send the user? (Onboarding removed — new users
  // land on the welcome/get-started screen; returning users go straight in.)
  entryRoute: () => {
    if (!flow.isAuthed()) return '/welcome';
    return '/dashboard';
  },
};
