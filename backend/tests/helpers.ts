import request from 'supertest';
import type { Application } from 'express';
import { Admin } from '../src/modules/admins/admin.model';
import { User } from '../src/modules/users/user.model';
import { passwordService } from '../src/modules/auth/password.service';
import {
  ADMIN_STATUS,
  GENDER,
  USER_STATUS,
  type Role,
  type AdminStatus,
  type UserStatus,
} from '../src/utils/constants';
import type { Permission } from '../src/rbac/permissions';

const DEFAULT_PASSWORD = 'Password123';

/** Create a staff account directly in the DB (bypassing the API) for test setup. */
export async function createStaff(opts: {
  role: Role;
  email: string;
  name?: string;
  password?: string;
  permissions?: Permission[];
  status?: AdminStatus;
}) {
  const password = opts.password ?? DEFAULT_PASSWORD;
  const passwordHash = await passwordService.hash(password);
  const admin = await Admin.create({
    name: opts.name ?? 'Staff Member',
    email: opts.email.toLowerCase(),
    passwordHash,
    role: opts.role,
    permissions: opts.permissions ?? [],
    status: opts.status ?? ADMIN_STATUS.ACTIVE,
  });
  return { admin, password };
}

/**
 * Create an app end-user (patient) directly in the DB for test setup. The
 * `firebaseUid` doubles as the mock Firebase token in integration tests where
 * `config/firebase` is stubbed to echo the bearer token as the uid.
 */
export async function createUser(opts: {
  firebaseUid: string;
  name?: string;
  phone?: string;
  status?: UserStatus;
}) {
  return User.create({
    firebaseUid: opts.firebaseUid,
    name: opts.name ?? 'Test Patient',
    phone: opts.phone ?? '+15551230000',
    gender: GENDER.MALE,
    dob: new Date('1990-01-01T00:00:00.000Z'),
    status: opts.status ?? USER_STATUS.ACTIVE,
  });
}

export function loginRequest(app: Application, email: string, password: string) {
  return request(app).post('/api/v1/admin/login').send({ email, password });
}

/** Log in and return the access token (tokens are top-level in `data`). */
export async function accessTokenFor(app: Application, email: string, password = DEFAULT_PASSWORD): Promise<string> {
  const res = await loginRequest(app, email, password);
  return res.body?.data?.accessToken as string;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
