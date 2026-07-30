import { OpaqueTokenService } from './opaque-token.service';

describe('OpaqueTokenService', () => {
  const service = new OpaqueTokenService();

  it('generates a token of the form <id>.<secret> with a persistable hash', () => {
    const generated = service.generate();
    expect(generated.token).toBe(
      `${generated.id}.${generated.token.split('.')[1]}`,
    );
    expect(generated.token.startsWith(`${generated.id}.`)).toBe(true);
    expect(generated.secretHash).toMatch(/^[0-9a-f]{64}$/);
    // The raw secret must never equal its stored hash.
    expect(generated.token).not.toContain(generated.secretHash);
  });

  it('parses a well-formed token and rejects malformed ones', () => {
    const generated = service.generate();
    const parsed = service.parse(generated.token);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(generated.id);

    expect(service.parse('no-separator')).toBeNull();
    expect(service.parse('.leading')).toBeNull();
    expect(service.parse('trailing.')).toBeNull();
  });

  it('verifies a correct secret and rejects a tampered one', () => {
    const generated = service.generate();
    const { secret } = service.parse(generated.token)!;
    expect(service.verify(secret, generated.secretHash)).toBe(true);
    expect(service.verify(`${secret}x`, generated.secretHash)).toBe(false);
    expect(service.verify('wrong', generated.secretHash)).toBe(false);
  });

  it('produces unique ids and secrets across generations', () => {
    const a = service.generate();
    const b = service.generate();
    expect(a.id).not.toBe(b.id);
    expect(a.secretHash).not.toBe(b.secretHash);
  });
});
