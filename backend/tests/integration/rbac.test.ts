// Rate limiting is process-global; stub it so authorization behaviour is what's
// under test here, not the IP limiter.
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  loginRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { ROLES } from '../../src/utils/constants';
import { PERMISSIONS } from '../../src/rbac/permissions';
import { createStaff, accessTokenFor, auth } from '../helpers';

const app = createApp();

describe('RBAC enforcement (backend is the authorization boundary)', () => {
  it('rejects an unauthenticated admin request with 401 (no token = no trust)', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a garbage/forged access token with 401 INVALID_TOKEN', async () => {
    const res = await request(app).get('/api/v1/admin/users').set(auth('not-a-real-jwt'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('allows SUPPORT to view users (has USER_VIEW) but forbids the admin roster (403, lacks ADMIN_VIEW)', async () => {
    await createStaff({ role: ROLES.SUPPORT, email: 'support@test.local' });
    const token = await accessTokenFor(app, 'support@test.local');

    const allowed = await request(app).get('/api/v1/admin/users').set(auth(token));
    expect(allowed.status).toBe(200);

    const forbidden = await request(app).get('/api/v1/admin/admins').set(auth(token));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  it('forbids an ADMIN from banning a clinic only when the permission is absent', async () => {
    // Default ADMIN holds CLINIC_BAN, so grant an explicit least-privilege set
    // WITHOUT it to prove the guard — not the role name — is what gates access.
    await createStaff({
      role: ROLES.ADMIN,
      email: 'limited@test.local',
      permissions: [PERMISSIONS.CLINIC_VIEW],
    });
    const token = await accessTokenFor(app, 'limited@test.local');

    const view = await request(app).get('/api/v1/admin/clinics').set(auth(token));
    expect(view.status).toBe(200);

    const ban = await request(app)
      .post('/api/v1/admin/clinics/507f1f77bcf86cd799439011/ban')
      .set(auth(token))
      .send({ reason: 'spam' });
    expect(ban.status).toBe(403);
  });

  it('blocks SUPPORT from creating an ADMIN account (service-level check, 403)', async () => {
    await createStaff({ role: ROLES.SUPPORT, email: 'sup2@test.local' });
    const token = await accessTokenFor(app, 'sup2@test.local');

    const res = await request(app)
      .post('/api/v1/admin/admins')
      .set(auth(token))
      .send({ name: 'New Admin', email: 'newadmin@test.local', role: ROLES.ADMIN, password: 'Password123' });
    expect(res.status).toBe(403);
  });

  it('refuses to create a second SUPER_ADMIN through the API (validation, 400)', async () => {
    await createStaff({ role: ROLES.SUPER_ADMIN, email: 'root@test.local' });
    const token = await accessTokenFor(app, 'root@test.local');

    const res = await request(app)
      .post('/api/v1/admin/admins')
      .set(auth(token))
      .send({ name: 'Rogue Root', email: 'rogue@test.local', role: ROLES.SUPER_ADMIN, password: 'Password123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
