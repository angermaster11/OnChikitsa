'use client';

// Web Firebase initialisation — used ONLY for the browser fallback (`npm run dev`
// and the static-export preview). On a real device the native
// @capacitor-firebase/authentication plugin uses the native SDK and reads
// android/app/google-services.json, so this JS config is not used for auth there.
//
// Everything is imported lazily inside the accessor so nothing touches `window`
// during the static-export prerender (Next renders this on the server at build).
//
// These are PUBLIC client identifiers (mirrored from google-services.json), not
// secrets — a Firebase web config is meant to ship in the client. For full web
// phone-auth a dedicated *Web* app should be registered in the Firebase console
// (project rangam-84f53) and its values supplied via the NEXT_PUBLIC_FIREBASE_*
// env vars below; the fallbacks are the Android app's and are enough to boot the
// SDK for development.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA9Npgcu9dQRJzclSrHB4PFkKxoryf1o_Y',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'rangam-84f53.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rangam-84f53',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'rangam-84f53.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || '870192958860',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:870192958860:android:929c5750d9e4bc772d5aa9',
};

let _authPromise = null;

/** Lazily initialise and return the Firebase JS Auth instance (browser only). */
export async function getWebAuth() {
  if (typeof window === 'undefined') return null;
  if (!_authPromise) {
    _authPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return getAuth(app);
    })();
  }
  return _authPromise;
}
