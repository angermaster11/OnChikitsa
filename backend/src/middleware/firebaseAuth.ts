import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, ERROR_CODES } from '../utils/errors';
import { getBearerToken } from '../utils/http';
import { verifyFirebaseIdToken } from '../config/firebase';
import { logger } from '../config/logger';
import { ROLES, USER_STATUS, CLINIC_STATUS } from '../utils/constants';
import { User } from '../modules/users/user.model';
import { Clinic } from '../modules/clinics/clinic.model';
import type { AuthActor } from '../types/auth';

type AppAccountType = 'USER' | 'CLINIC';

/**
 * Authenticate an APP request (USER or CLINIC) from a verified Firebase ID token.
 *
 * The trusted identity is the Firebase UID extracted from the *verified* token —
 * never req.body.userId / firebaseUid / role. We then load the matching account
 * and enforce account status: a BANNED or DELETED account is rejected with 403
 * even though Firebase still considers the session valid. This is the DB-side
 * ban enforcement the spec requires.
 */
export function firebaseAuth(accountType: AppAccountType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = getBearerToken(req);
      if (!token) throw new UnauthorizedError();

      let decoded;
      try {
        decoded = await verifyFirebaseIdToken(token);
      } catch (err) {
        logger.warn({ err }, 'Firebase token verification failed');
        throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired Firebase token');
      }

      const actor =
        accountType === 'USER'
          ? await resolveUserActor(decoded.uid)
          : await resolveClinicActor(decoded.uid);

      req.actor = actor;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Verify a Firebase token WITHOUT requiring an existing account record. Used for
 * first-time registration, where the profile does not exist yet. Attaches a
 * minimal actor carrying only the trusted Firebase UID.
 */
export function firebaseIdentity(role: typeof ROLES.USER | typeof ROLES.CLINIC) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = getBearerToken(req);
      if (!token) throw new UnauthorizedError();
      let decoded;
      try {
        decoded = await verifyFirebaseIdToken(token);
      } catch (err) {
        logger.warn({ err }, 'Firebase token verification failed');
        throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired Firebase token');
      }
      req.actor = {
        kind: 'APP',
        id: '',
        role,
        name: '',
        email: decoded.email,
        permissions: [],
        firebaseUid: decoded.uid,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

async function resolveUserActor(firebaseUid: string): Promise<AuthActor> {
  const user = await User.findOne({ firebaseUid });
  if (!user) throw new UnauthorizedError(ERROR_CODES.USER_NOT_FOUND, 'No user account for this identity');
  if (user.status === USER_STATUS.BANNED) {
    throw new ForbiddenError(ERROR_CODES.ACCOUNT_BANNED, 'This account has been banned');
  }
  if (user.status === USER_STATUS.DELETED) {
    throw new ForbiddenError(ERROR_CODES.ACCOUNT_DELETED, 'This account has been deleted');
  }
  return {
    kind: 'APP',
    id: String(user._id),
    role: ROLES.USER,
    name: user.name,
    email: user.email,
    permissions: [],
    firebaseUid,
  };
}

async function resolveClinicActor(firebaseUid: string): Promise<AuthActor> {
  const clinic = await Clinic.findOne({ firebaseUid });
  if (!clinic) throw new UnauthorizedError(ERROR_CODES.CLINIC_NOT_FOUND, 'No clinic account for this identity');
  if (clinic.status === CLINIC_STATUS.BANNED) {
    throw new ForbiddenError(ERROR_CODES.ACCOUNT_BANNED, 'This clinic has been banned');
  }
  if (clinic.status === CLINIC_STATUS.DELETED) {
    throw new ForbiddenError(ERROR_CODES.ACCOUNT_DELETED, 'This clinic has been deleted');
  }
  return {
    kind: 'APP',
    id: String(clinic._id),
    role: ROLES.CLINIC,
    name: clinic.name,
    email: clinic.email,
    permissions: [],
    firebaseUid,
  };
}
