import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing with Argon2id (memory-hard, side-channel resistant).
 * Parameters chosen as a sensible production baseline; tune to your hardware.
 */
const ARGON2_OPTIONS = {
  // 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
  algorithm: 2 as const,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export const passwordService = {
  async hash(plain: string): Promise<string> {
    return hash(plain, ARGON2_OPTIONS);
  },

  async verify(hashString: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashString, plain, ARGON2_OPTIONS);
    } catch {
      // A malformed hash should read as "does not match", never crash auth.
      return false;
    }
  },
};
