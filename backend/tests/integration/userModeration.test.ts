// Firebase verification is stubbed so app-auth tests don't need a real Firebase
// project: the bearer token IS treated as the verified uid. Rate limiter is
// stubbed for deterministic behaviour.
jest.mock('../../src/config/firebase', () => ({
  verifyFirebaseIdToken: jest.fn(async (token: string) => ({ uid: token })),
  revokeFirebaseUser: jest.fn(async () => undefined),
  getFirebaseApp: jest.fn(() => null),
}));
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  loginRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { ROLES, USER_STATUS } from '../../src/utils/constants';
import { AuditLog } from '../../src/modules/audit/auditLog.model';
import { User } from '../../src/modules/users/user.model';
import { createStaff, createUser, accessTokenFor, auth } from '../helpers';

const app = createApp();

describe('User moderation + DB-side status enforcement', () => {
  it('bans a user, flips status to BANNED, and writes an immutable audit trail naming the actor', async () => {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'root@test.local', name: 'Root' });
    const token = await accessTokenFor(app, 'root@test.local');
    const user = await createUser({ firebaseUid: 'uid-victim', name: 'Arjun' });

    const res = await request(app)
      .post(`/api/v1/admin/users/${user._id}/ban`)
      .set(auth(token))
      .send({ reason: 'abuse of service' });
    expect(res.status).toBe(200);

    const reloaded = await User.findById(user._id);
    expect(reloaded?.status).toBe(USER_STATUS.BANNED);
    expect(reloaded?.banReason).toBe('abuse of service');

    // Audit identifies WHO did it, their role, and WHAT was acted on.
    const log = await AuditLog.findOne({ action: 'USER_BANNED', targetId: user._id });
    expect(log).toBeTruthy();
    expect(log?.actorRole).toBe(ROLES.SUPER_ADMIN);
    expect(log?.actorName).toBe('Root');
    expect(log?.description).toMatch(/Arjun/);
  });

  it('rejects double-banning the same user with 409 ALREADY_BANNED', async () => {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'root@test.local' });
    const token = await accessTokenFor(app, 'root@test.local');
    const user = await createUser({ firebaseUid: 'uid-2', status: USER_STATUS.BANNED });

    const res = await request(app)
      .post(`/api/v1/admin/users/${user._id}/ban`)
      .set(auth(token))
      .send({ reason: 'again' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_BANNED');
  });

  it('blocks a BANNED user on every request via a live DB status check (403 ACCOUNT_BANNED)', async () => {
    await createUser({ firebaseUid: 'banned-uid', status: USER_STATUS.BANNED });
    // The mock treats the bearer token as the verified uid.
    const res = await request(app).get('/api/v1/user/me').set(auth('banned-uid'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BANNED');
  });

  it('lets an ACTIVE user reach their own profile', async () => {
    await createUser({ firebaseUid: 'active-uid', name: 'Healthy' });
    const res = await request(app).get('/api/v1/user/me').set(auth('active-uid'));
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Healthy');
  });

  it('rejects an app request with no token (401)', async () => {
    const res = await request(app).get('/api/v1/user/me');
    expect(res.status).toBe(401);
  });

  it('does not let an app (USER) token reach a staff-only admin endpoint', async () => {
    await createUser({ firebaseUid: 'sneaky-uid' });
    // A Firebase uid is not a staff JWT; adminAuth must reject it as an invalid token.
    const res = await request(app).get('/api/v1/admin/users').set(auth('sneaky-uid'));
    expect(res.status).toBe(401);
  });
});
