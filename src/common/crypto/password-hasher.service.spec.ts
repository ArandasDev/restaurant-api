import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('hashes a password to an argon2id digest that verifies', async () => {
    const hash = await service.hash('Str0ng!Pass');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(hash, 'Str0ng!Pass')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Str0ng!Pass');
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false (never throws) on an invalid hash string', async () => {
    await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
  });

  it('salts hashes so identical passwords differ', async () => {
    const a = await service.hash('same-Password1!');
    const b = await service.hash('same-Password1!');
    expect(a).not.toBe(b);
  });
});
