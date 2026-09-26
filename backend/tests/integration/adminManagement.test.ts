jest.mock('../../src/middleware/rateLimiter', () => ({
  apiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  loginRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { ROLES } from '../../src/utils/constants';
import { createStaff, loginRequest, accessTokenFor, auth } from '../helpers';

const app = createApp();

describe('Staff management (SUPER_ADMIN)', () => {
  async function superAdminToken() {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'root@test.local', name: 'Root' });
    return accessTokenFor(app, 'root@test.local');
  }

  it('creates a SUPPORT account that can then log in (hashed password, ACTIVE)', async () => {
    const token = await superAdminToken();
    const created = await request(app)
      .post('/api/v1/admin/admins')
      .set(auth(token))
      .send({ name: 'Sam Support', email: 'sam@test.local', role: ROLES.SUPPORT, password: 'Password123' });

    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(ROLES.SUPPORT);
    expect(created.body.data.status).toBe('ACTIVE');
    expect(JSON.stringify(created.body)).not.toMatch(/passwordHash/);

    // The created account is real and usable.
    const login = await loginRequest(app, 'sam@test.local', 'Password123');
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
  });

  it('rejects a weak password with 400 VALIDATION_ERROR', async () => {
    const token = await superAdminToken();
    const res = await request(app)
      .post('/api/v1/admin/admins')
      .set(auth(token))
      .send({ name: 'Weak', email: 'weak@test.local', role: ROLES.ADMIN, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
    const token = await superAdminToken();
    await createStaff({ role: ROLES.ADMIN, email: 'dupe@test.local' });
    const res = await request(app)
      .post('/api/v1/admin/admins')
      .set(auth(token))
      .send({ name: 'Dupe', email: 'dupe@test.local', role: ROLES.ADMIN, password: 'Password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('protects the SUPER_ADMIN account from disable via the API (403 PROTECTED_RESOURCE)', async () => {
    const token = await superAdminToken();
    const { admin: otherRoot } = await createStaff({ role: ROLES.SUPER_ADMIN, email: 'root2@test.local' });
    const res = await request(app)
      .post(`/api/v1/admin/admins/${otherRoot._id}/disable`)
      .set(auth(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROTECTED_RESOURCE');
  });

  it('does not let an actor disable their own account (403)', async () => {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'self@test.local' });
    const login = await loginRequest(app, 'self@test.local', 'Password123');
    const token = login.body.data.accessToken;
    const selfId = login.body.data.admin.id;

    const res = await request(app).post(`/api/v1/admin/admins/${selfId}/disable`).set(auth(token));
    expect(res.status).toBe(403);
  });

  it('rejects an over-large page limit at the validation layer (400, max is 100)', async () => {
    const token = await superAdminToken();
    const res = await request(app).get('/api/v1/admin/admins?page=1&limit=500').set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns DB-level pagination metadata for a valid query', async () => {
    const token = await superAdminToken();
    const res = await request(app).get('/api/v1/admin/admins?page=1&limit=10').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.page).toBe(1);
    expect(typeof res.body.pagination.total).toBe('number');
  });
});
