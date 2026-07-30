import { normalizeCep } from './cep-lookup.port';

describe('normalizeCep', () => {
  it('accepts 8-digit CEPs with or without a mask', () => {
    expect(normalizeCep('01001000')).toBe('01001000');
    expect(normalizeCep('01001-000')).toBe('01001000');
    expect(normalizeCep(' 01001-000 ')).toBe('01001000');
  });

  it('rejects CEPs that are not 8 digits', () => {
    expect(normalizeCep('123')).toBeNull();
    expect(normalizeCep('123456789')).toBeNull();
    expect(normalizeCep('abcdefgh')).toBeNull();
  });
});
