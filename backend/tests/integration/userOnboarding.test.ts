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
import { USER_STATUS } from '../../src/utils/constants';
import { User } from '../../src/modules/users/user.model';
import { createUser, auth } from '../helpers';

const app = createApp();

// The mock treats the bearer token as the verified Firebase uid, so a token
// like 'new-uid' registers/authenticates the account with that firebaseUid.
const register = (token: string, body: Record<string, unknown>) =>
  request(app).post('/api/v1/user/register').set(auth(token)).send(body);

describe('User registration + onboarding funnel', () => {
  it('creates a passwordless account from name + phone with sane onboarding defaults', async () => {
    const res = await register('new-uid', { name: 'Aarav', phone: '+919812345678' });

    expect(res.status).toBe(201);
    expect(res.body.data.onboardingStatus).toBe('PENDING');
    expect(res.body.data.authProvider).toBe('PHONE');
    expect(res.body.data.notificationPermission).toBe('PROMPT');
    expect(res.body.data.locationPermission).toBe('PROMPT');
    expect(res.body.data.lastLoginAt).toBeTruthy();
    // Demographics are optional at registration — filled in later via PATCH /me.
    expect(res.body.data.gender).toBeUndefined();
    expect(res.body.data.dob).toBeUndefined();
  });

  it('persists optional demographics + initial permission decisions when supplied', async () => {
    const res = await register('demo-uid', {
      name: 'Diya',
      phone: '+919800000001',
      gender: 'FEMALE',
      dob: '1996-05-04',
      email: 'Diya@Example.com',
      height: 165,
      weight: 58,
      locationPermission: 'GRANTED',
      location: { lat: 19.07, lng: 72.87, accuracy: 12 },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.gender).toBe('FEMALE');
    expect(res.body.data.email).toBe('diya@example.com');
    expect(res.body.data.locationPermission).toBe('GRANTED');
    expect(res.body.data.location.lat).toBeCloseTo(19.07);
    expect(res.body.data.location.updatedAt).toBeTruthy();
  });

  it('reports 401 USER_NOT_FOUND for the account-exists probe when no profile exists', async () => {
    // This is the post-OTP "does the account exist?" check the app relies on.
    const res = await request(app).get('/api/v1/user/me').set(auth('ghost-uid'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('rejects a duplicate registration for the same Firebase identity (409)', async () => {
    await register('dupe-uid', { name: 'Ishaan', phone: '+919811111111' });
    const res = await register('dupe-uid', { name: 'Ishaan', phone: '+919811111111' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects registering a phone already owned by another active account (409 PHONE_TAKEN)', async () => {
    await register('owner-uid', { name: 'Kabir', phone: '+919822222222' });
    const res = await register('other-uid', { name: 'Copycat', phone: '+919822222222' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });

  it('lets a soft-deleted account release its phone for re-registration', async () => {
    await createUser({ firebaseUid: 'gone-uid', phone: '+919833333333', status: USER_STATUS.DELETED });
    const res = await register('fresh-uid', { name: 'Reborn', phone: '+919833333333' });
    expect(res.status).toBe(201);
  });

  it('refreshes lastLoginAt on each /me without bumping updatedAt', async () => {
    const created = await createUser({ firebaseUid: 'active-uid', name: 'Meera' });
    expect(created.lastLoginAt).toBeUndefined();
    const updatedAtBefore = created.updatedAt.getTime();

    const res = await request(app).get('/api/v1/user/me').set(auth('active-uid'));
    expect(res.status).toBe(200);

    const reloaded = await User.findById(created._id);
    expect(reloaded?.lastLoginAt).toBeTruthy();
    expect(reloaded?.updatedAt.getTime()).toBe(updatedAtBefore);
  });

  it('records permission + location + onboarding progress via PATCH /me', async () => {
    await createUser({ firebaseUid: 'onb-uid', name: 'Nova' });

    const res = await request(app)
      .patch('/api/v1/user/me')
      .set(auth('onb-uid'))
      .send({
        gender: 'OTHER',
        locationPermission: 'GRANTED',
        location: { lat: 12.97, lng: 77.59 },
        notificationPermission: 'DENIED',
        onboardingStatus: 'COMPLETED',
      });

    expect(res.status).toBe(200);
    const reloaded = await User.findOne({ firebaseUid: 'onb-uid' });
    expect(reloaded?.locationPermission).toBe('GRANTED');
    expect(reloaded?.notificationPermission).toBe('DENIED');
    expect(reloaded?.onboardingStatus).toBe('COMPLETED');
    expect(reloaded?.location?.lat).toBeCloseTo(12.97);
    expect(reloaded?.location?.updatedAt).toBeTruthy();
  });

  it('rejects unknown fields on PATCH /me (strict schema, 400)', async () => {
    await createUser({ firebaseUid: 'strict-uid', name: 'Ora' });
    const res = await request(app)
      .patch('/api/v1/user/me')
      .set(auth('strict-uid'))
      .send({ isAdmin: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
