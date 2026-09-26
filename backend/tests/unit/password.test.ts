import { passwordService } from '../../src/modules/auth/password.service';

describe('passwordService (Argon2id)', () => {
  it('produces a non-plaintext argon2id hash that verifies correctly', async () => {
    const plain = 'S3cretPass!';
    const hash = await passwordService.hash(plain);

    expect(hash).not.toContain(plain);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await passwordService.verify(hash, plain)).toBe(true);
    expect(await passwordService.verify(hash, 'wrong-password')).toBe(false);
  });

  it('returns false (never throws) for a malformed hash', async () => {
    await expect(passwordService.verify('not-a-real-hash', 'x')).resolves.toBe(false);
  });
});
