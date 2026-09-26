'use client';

// Unified auth surface over Firebase. Native (Android/iOS) goes through the
// Capacitor Firebase Authentication plugin — which uses the native SDK and reads
// google-services.json — while the browser falls back to the Firebase JS SDK.
//
// Every Capacitor/plugin/firebase import is dynamic and guarded so the
// static-export build (which runs this module through Node during prerender)
// never loads native-only or window-dependent code at module scope. There is NO
// fake/bypass auth: a real Firebase session is always required.

let _capPromise = null;
async function cap() {
  if (!_capPromise) _capPromise = import('@capacitor/core');
  return _capPromise;
}

export async function isNative() {
  try {
    const { Capacitor } = await cap();
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// NOTE: never `return`/resolve a promise with the Capacitor plugin proxy itself.
// The proxy answers ANY property access (including `.then`) with a callable, so
// JS's promise machinery mistakes it for a thenable and forwards a bogus native
// `then()` call — which fails with
//   Error: "FirebaseAuthentication.then()" is not implemented on android
// and the await never settles (OTP screen spins on "Sending code…" forever).
// Wrap it in a plain object so the resolved value is non-thenable, and pull the
// proxy out with destructuring at the call site (never `await` the proxy).
async function nativeAuth() {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  return { FirebaseAuthentication };
}

function recaptchaContainer() {
  let el = document.getElementById('recaptcha-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'recaptcha-container';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}

// A single in-flight phone verification, tracked between sendOtp and confirmOtp.
// Shapes: { verificationId } (native) | { confirmation } (web) | { auto: true }.
let _pending = null;

// How long we wait for Firebase to deliver the SMS (or fire a failure event)
// before giving up. Without this the native phone-auth flow can hang forever
// when app verification (SHA fingerprints / Phone provider) is not set up in the
// Firebase console — the plugin simply never emits any event, and the OTP screen
// would spin on "Sending code…" indefinitely.
const OTP_SEND_TIMEOUT_MS = 60000;

/** Reject a promise if it neither resolves nor rejects within `ms`. */
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const TIMEOUT_MSG =
  'Timed out waiting for the SMS. Make sure Phone sign-in is enabled in the ' +
  'Firebase console and your app is registered (SHA fingerprints on Android / ' +
  'a Web app + authorised domain on the browser), then try again.';

/**
 * Start phone verification for an E.164 number. Resolves once the SMS is sent
 * (or, on Android, once instant SIM-based verification completes, in which case
 * `autoVerified` is true and the user is already signed in). Throws on failure.
 */
export async function sendOtp(phoneE164) {
  _pending = null;
  if (await isNative()) {
    const { FirebaseAuthentication } = await nativeAuth();
    await FirebaseAuthentication.removeAllListeners();
    const cleanup = () => { FirebaseAuthentication.removeAllListeners().catch(() => {}); };
    const flow = new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, arg) => { if (!settled) { settled = true; fn(arg); } };
      FirebaseAuthentication.addListener('phoneCodeSent', (e) => done(resolve, e.verificationId));
      FirebaseAuthentication.addListener('phoneVerificationCompleted', () => {
        _pending = { auto: true };
        done(resolve, null);
      });
      FirebaseAuthentication.addListener('phoneVerificationFailed', (e) =>
        done(reject, new Error(e?.message || 'Phone verification failed.')));
      FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phoneE164 })
        .catch((err) => done(reject, err));
    });
    let verificationId;
    try {
      verificationId = await withTimeout(flow, OTP_SEND_TIMEOUT_MS, TIMEOUT_MSG);
    } finally {
      cleanup();
    }
    if (verificationId) _pending = { verificationId };
    return { autoVerified: !!(_pending && _pending.auto) };
  }
  // Web fallback: Firebase JS SDK with an invisible reCAPTCHA.
  const { getWebAuth } = await import('./firebase');
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
  const auth = await getWebAuth();
  const verifier = new RecaptchaVerifier(auth, recaptchaContainer(), { size: 'invisible' });
  const confirmation = await withTimeout(
    signInWithPhoneNumber(auth, phoneE164, verifier),
    OTP_SEND_TIMEOUT_MS,
    TIMEOUT_MSG,
  );
  _pending = { confirmation };
  return { autoVerified: false };
}

/** Confirm the SMS code, completing sign-in. Throws on an invalid/expired code. */
export async function confirmOtp(code) {
  if (!_pending) throw new Error('No verification in progress. Please request a new code.');
  if (_pending.auto) { _pending = null; return; }
  if (await isNative()) {
    const { FirebaseAuthentication } = await nativeAuth();
    await FirebaseAuthentication.confirmVerificationCode({
      verificationId: _pending.verificationId,
      verificationCode: code,
    });
    await FirebaseAuthentication.removeAllListeners();
    _pending = null;
    return;
  }
  await _pending.confirmation.confirm(code);
  _pending = null;
}

/** The current signed-in Firebase user, or null. Restores persisted sessions. */
export async function getCurrentUser() {
  if (await isNative()) {
    const { FirebaseAuthentication } = await nativeAuth();
    const { user } = await FirebaseAuthentication.getCurrentUser();
    return user || null;
  }
  const { getWebAuth } = await import('./firebase');
  const { onAuthStateChanged } = await import('firebase/auth');
  const auth = await getWebAuth();
  if (!auth) return null;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user || null); });
  });
}

/** A fresh Firebase ID token for the backend `Authorization: Bearer` header. */
export async function getIdToken(forceRefresh = false) {
  if (await isNative()) {
    const { FirebaseAuthentication } = await nativeAuth();
    const res = await FirebaseAuthentication.getIdToken({ forceRefresh });
    return (res && res.token) || null;
  }
  const { getWebAuth } = await import('./firebase');
  const auth = await getWebAuth();
  let user = auth && auth.currentUser;
  if (!user) user = await getCurrentUser();
  return user ? user.getIdToken(forceRefresh) : null;
}

/** Sign out of the current platform's Firebase session. */
export async function signOut() {
  if (await isNative()) {
    const { FirebaseAuthentication } = await nativeAuth();
    await FirebaseAuthentication.signOut();
    return;
  }
  const { getWebAuth } = await import('./firebase');
  const { signOut: fbSignOut } = await import('firebase/auth');
  const auth = await getWebAuth();
  if (auth) await fbSignOut(auth);
}
