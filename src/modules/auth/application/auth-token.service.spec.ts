import { JwtService } from '@nestjs/jwt';
import { OpaqueTokenService } from '../../../common/crypto/opaque-token.service';
import { Role } from '../../../common/enums/role.enum';
import { UnauthorizedError } from '../../../common/errors/domain-error';
import {
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../domain/token.repository';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const jwtConfig = {
    accessSecret: 'a'.repeat(40),
    accessTtl: 900,
    refreshSecret: 'r'.repeat(40),
    refreshTtl: 1000,
    passwordResetTtl: 3600,
  };
  const config = { getOrThrow: () => jwtConfig } as never;
  const principal = { id: 'user-1', tenantId: 'tenant-1', role: Role.CONSUMER };

  let refreshRepo: jest.Mocked<RefreshTokenRepository>;
  let service: AuthTokenService;
  const jwt = new JwtService();
  const opaque = new OpaqueTokenService();

  beforeEach(() => {
    refreshRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthTokenService(jwt, opaque, config, refreshRepo);
  });

  it('issues a signed access token and a persisted refresh token', async () => {
    const tokens = await service.issueTokens(principal);
    expect(tokens.expiresIn).toBe(900);
    const decoded = jwt.verify(tokens.accessToken, {
      secret: jwtConfig.accessSecret,
    });
    expect(decoded.sub).toBe('user-1');
    expect(decoded.tenantId).toBe('tenant-1');
    expect(refreshRepo.create).toHaveBeenCalledTimes(1);
    expect(tokens.refreshToken).toContain('.');
  });

  it('rotates a valid refresh token and revokes the old one', async () => {
    const tokens = await service.issueTokens(principal);
    const created = refreshRepo.create.mock.calls[0][0];
    const stored: StoredRefreshToken = {
      id: created.id,
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: created.tokenHash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    };
    refreshRepo.findById.mockResolvedValue(stored);

    const result = await service.rotate(tokens.refreshToken);
    expect(result).toEqual({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(refreshRepo.revoke).toHaveBeenCalledWith(created.id);
  });

  it.each([
    ['malformed', 'no-dot-here'],
    ['unknown id', 'missing.secret'],
  ])('rejects a %s refresh token', async (_label, token) => {
    refreshRepo.findById.mockResolvedValue(null);
    await expect(service.rotate(token)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejects an expired or revoked refresh token', async () => {
    const tokens = await service.issueTokens(principal);
    const created = refreshRepo.create.mock.calls[0][0];
    refreshRepo.findById.mockResolvedValue({
      id: created.id,
      userId: 'user-1',
      tenantId: 'tenant-1',
      tokenHash: created.tokenHash,
      expiresAt: new Date(Date.now() - 1),
      revokedAt: null,
    });
    await expect(service.rotate(tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
