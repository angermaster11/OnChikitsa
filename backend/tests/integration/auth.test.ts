// Rate limiting is process-global and would leak across tests; stub it out so
// the auth behaviour under test is deterministic (lockout is tested separately
// at the account level, which is independent of the IP limiter).
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  loginRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { ROLES } from '../../src/utils/constants';
import { createStaff, loginRequest, accessTokenFor, auth } from '../helpers';

const app = createApp();

describe('Staff authentication', () => {
  it('logs in a valid account and returns tokens + permissions at data top-level', async () => {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'sa@test.local', name: 'Root' });
    const res = await loginRequest(app, 'sa@test.local', 'Password123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(Array.isArray(res.body.data.permissions)).toBe(true);
    // Never leak the password hash.
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS and no token', async () => {
    await createStaff({ role: ROLES.ADMIN, email: 'a@test.local' });
    const res = await loginRequest(app, 'a@test.local', 'wrong-password');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.data).toBeUndefined();
  });

  it('rejects an unknown account with the same generic 401 (no enumeration)', async () => {
    const res = await loginRequest(app, 'ghost@test.local', 'whatever');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('locks the account after MAX_LOGIN_ATTEMPTS failures', async () => {
    await createStaff({ role: ROLES.ADMIN, email: 'lock@test.local' });
    for (let i = 0; i < 5; i += 1) {
      await loginRequest(app, 'lock@test.local', 'wrong');
    }
    // Even the CORRECT password is now refused while locked.
    const res = await loginRequest(app, 'lock@test.local', 'Password123');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/locked/i);
  });

  it('returns the actor from /admin/me and rejects /admin/me without a token', async () => {
    await createStaff({ role: ROLES.ADMIN, email: 'me@test.local', name: 'Mia' });
    const token = await accessTokenFor(app, 'me@test.local');

    const ok = await request(app).get('/api/v1/admin/me').set(auth(token));
    expect(ok.status).toBe(200);
    expect(ok.body.data.role).toBe(ROLES.ADMIN);
    expect(Array.isArray(ok.body.data.permissions)).toBe(true);

    const anon = await request(app).get('/api/v1/admin/me');
    expect(anon.status).toBe(401);
  });

  it('rotates refresh tokens and rejects reuse of the old one', async () => {
    await createStaff({ role: ROLES.ADMIN, email: 'r@test.local' });
    const login = await loginRequest(app, 'r@test.local', 'Password123');
    const oldRefresh = login.body.data.refreshToken;

    const rotated = await request(app).post('/api/v1/admin/refresh').send({ refreshToken: oldRefresh });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.accessToken).toBeTruthy();

    const reuse = await request(app).post('/api/v1/admin/refresh').send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('rejects a disabled account at login with 403 ACCOUNT_DISABLED', async () => {
    await createStaff({ role: ROLES.ADMIN, email: 'disabled@test.local', status: 'DISABLED' as never });
    const res = await loginRequest(app, 'disabled@test.local', 'Password123');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});
