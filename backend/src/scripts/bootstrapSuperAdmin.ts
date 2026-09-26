import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Admin } from '../modules/admins/admin.model';
import { passwordService } from '../modules/auth/password.service';
import { ROLES, ADMIN_STATUS } from '../utils/constants';
import { normalizeEmail } from '../utils/normalize';

/**
 * Secure Super Admin bootstrap.
 *
 * The Super Admin is NEVER hardcoded. It is created from environment variables
 * (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_NAME) with the password
 * hashed via Argon2id before it ever touches the database. The script is
 * idempotent: run it repeatedly and it will only create the account once.
 *
 *   npm run seed:superadmin
 */
async function bootstrapSuperAdmin(): Promise<void> {
  const email = env.SUPER_ADMIN_EMAIL;
  const password = env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to bootstrap the Super Admin.',
    );
    process.exit(1);
  }

  await connectDatabase();

  const normalizedEmail = normalizeEmail(email);
  const existing = await Admin.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    logger.info({ email: normalizedEmail }, 'Super Admin already exists — nothing to do.');
    await disconnectDatabase();
    return;
  }

  const passwordHash = await passwordService.hash(password);
  const admin = await Admin.create({
    name: env.SUPER_ADMIN_NAME,
    email: normalizedEmail,
    passwordHash,
    role: ROLES.SUPER_ADMIN,
    permissions: [], // SUPER_ADMIN implicitly holds every permission.
    status: ADMIN_STATUS.ACTIVE,
  });

  // Never log the password (or its hash).
  logger.info({ id: admin.id, email: normalizedEmail }, 'Super Admin created successfully.');
  await disconnectDatabase();
}

bootstrapSuperAdmin().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap Super Admin');
  process.exit(1);
});
