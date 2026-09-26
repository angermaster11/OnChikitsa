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
 * Verify a Firebase ID token and return the trusted identity. `checkRevoked`
 * enforces token revocation (used for strong session invalidation on ban).
 * Throws if Firebase is not configured or the token is invalid/revoked.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured');
  }
  const decoded = await app.auth().verifyIdToken(idToken, true);
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
