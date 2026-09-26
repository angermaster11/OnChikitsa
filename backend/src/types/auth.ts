import type { Role } from '../utils/constants';
import type { Permission } from '../rbac/permissions';

/**
 * The authenticated principal attached to `req.actor` by an auth middleware.
 * Two flavours share one shape so downstream code has a uniform contract:
 *  - STAFF: SUPER_ADMIN / ADMIN / SUPPORT authenticated via backend JWT.
 *  - APP:   USER / CLINIC authenticated via a verified Firebase ID token.
 */
export type ActorKind = 'STAFF' | 'APP';

export interface AuthActor {
  kind: ActorKind;
  /** Mongo _id (string) of the underlying admin/user/clinic record. */
  id: string;
  role: Role;
  name: string;
  email?: string;
  /** Effective permissions — only populated for STAFF actors. */
  permissions: Permission[];
  /** Firebase UID — only populated for APP actors. */
  firebaseUid?: string;
}

export interface JwtAccessPayload {
  sub: string; // admin _id
  role: Role;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string; // admin _id
  jti: string; // refresh-token record id (for rotation/revocation)
  type: 'refresh';
}
