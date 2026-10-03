import admin from 'firebase-admin';
import { env } from './env';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Lazily initialise the Firebase Admin SDK. Initialisation is guarded so the
 * backend can still boot (for admin-panel work) when Firebase service-account
 * credentials are not configured in local dev — user/clinic auth simply fails
 * with a clear error in that case.
 */
export function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  if (!env.firebaseConfigured) {
    logger.warn(
      'Firebase Admin SDK is not configured (missing FIREBASE_* env vars). ' +
        'User/Clinic authentication will be unavailable until credentials are set.',
    );
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });
  logger.info('Firebase Admin SDK initialised');
  return firebaseApp;
}

export interface VerifiedFirebaseToken {
  uid: string;
  phoneNumber?: string;
  email?: string;
}

/**
 * Verify a Firebase ID token and return the trusted identity.
 *
 * `checkRevoked` is false: that keeps verification a LOCAL signature check against
 * cached Google public keys (no per-request network round-trip to Firebase), which
 * matters on the hot path at scale. Revocation/ban is still enforced every request
 * by the DB account-status check in firebaseAuth (resolveUserActor/resolveClinicActor),
 * so a banned account is rejected immediately regardless; only a Firebase-side token
 * revoke (e.g. password reset) lags until the token naturally expires (≤1h).
 * Throws if Firebase is not configured or the token is invalid.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured');
  }
  const decoded = await app.auth().verifyIdToken(idToken, false);
  return {
    uid: decoded.uid,
    phoneNumber: decoded.phone_number,
    email: decoded.email,
  };
}

/**
 * Revoke all refresh tokens for a Firebase user (strong session invalidation on
 * ban). Best-effort: no-ops when Firebase is not configured and never throws, so
 * a ban still succeeds even if Firebase is transiently unreachable.
 */
export async function revokeFirebaseUser(uid: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  try {
    await app.auth().revokeRefreshTokens(uid);
  } catch (err) {
    logger.warn({ err, uid }, 'Failed to revoke Firebase refresh tokens');
  }
}

export interface PushMessage {
  title: string;
  body: string;
  /** String-only key/values delivered to the client (e.g. a deep-link `route`). */
  data?: Record<string, string>;
}

/**
 * Send a push notification to many device tokens via FCM. Best-effort: no-ops when
 * Firebase is unconfigured or there are no tokens (so local/dev never throws), and
 * never rejects — a send failure is logged. Returns the tokens FCM reported as
 * permanently invalid so the caller can prune them from its store. FCM caps a
 * multicast at 500 tokens, so we batch.
 */
export async function sendPush(
  tokens: string[],
  msg: PushMessage,
): Promise<{ invalidTokens: string[] }> {
  const app = getFirebaseApp();
  if (!app || tokens.length === 0) return { invalidTokens: [] };

  const data = msg.data
    ? Object.fromEntries(Object.entries(msg.data).map(([k, v]) => [k, String(v)]))
    : undefined;
  const invalidTokens: string[] = [];
  const DEAD = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
  ]);

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      const res = await app.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title: msg.title, body: msg.body },
        data,
        android: { priority: 'high', notification: { channelId: 'default' } },
      });
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && DEAD.has(r.error.code)) invalidTokens.push(batch[idx]);
      });
    } catch (err) {
      logger.warn({ err }, 'FCM multicast send failed');
    }
  }
  return { invalidTokens };
}
