import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Boots an in-memory MongoDB once for the whole test run and injects the
 * connection string + required secrets into the environment BEFORE any module
 * (notably src/config/env.ts, which validates env at import time) is loaded.
 *
 * Tests run with `--runInBand`, so mutating process.env here is visible to the
 * test workers in the same process.
 */
export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  (globalThis as unknown as { __MONGOD__?: MongoMemoryServer }).__MONGOD__ = mongod;

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongod.getUri('onchikitsa_test');
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-abcdef';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789-abcdef';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  process.env.SUPER_ADMIN_EMAIL = 'superadmin@test.local';
  process.env.SUPER_ADMIN_PASSWORD = 'SuperSecret123';
  process.env.LOG_LEVEL = 'silent';
}
