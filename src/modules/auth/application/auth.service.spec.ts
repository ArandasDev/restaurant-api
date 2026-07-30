import { Role } from '../../../common/enums/role.enum';
import {
  UnauthorizedError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { AuthService } from './auth.service';

const TENANT = 'tenant-1';

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    tenantId: TENANT,
    email: 'maria@example.com',
    passwordHash: 'hash',
    role: Role.CONSUMER,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: { withTenant: jest.Mock };
  let tenantContext: { get: jest.Mock };
  let hasher: { hash: jest.Mock; verify: jest.Mock };
  let opaque: { generate: jest.Mock; parse: jest.Mock; verify: jest.Mock };
  let tokens: { issueTokens: jest.Mock; rotate: jest.Mock; revoke: jest.Mock };
  let audit: { record: jest.Mock };
  let users: {
    findByEmailInTenant: jest.Mock;
    findById: jest.Mock;
    updatePassword: jest.Mock;
  };
  let refreshTokens: { revokeAllForUser: jest.Mock };
  let resetTokens: {
    create: jest.Mock;
    findById: jest.Mock;
    markUsed: jest.Mock;
    invalidateAllForUser: jest.Mock;
  };
  let mailer: { sendPasswordReset: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      withTenant: jest.fn((_t: string, fn: (tx: unknown) => unknown) => fn({})),
    };
    tenantContext = { get: jest.fn().mockReturnValue(TENANT) };
    hasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      verify: jest.fn(),
    };
    opaque = { generate: jest.fn(), parse: jest.fn(), verify: jest.fn() };
    tokens = {
      issueTokens: jest.fn().mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
      }),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    users = {
      findByEmailInTenant: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };
    refreshTokens = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    resetTokens = {
      create: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
      invalidateAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    mailer = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    const config = {
      getOrThrow: () => ({ passwordResetTtl: 3600 }),
    };

    service = new AuthService(
      prisma as never,
      tenantContext as never,
      hasher as never,
      opaque as never,
      tokens as never,
      audit as never,
      config as never,
      users as never,
      refreshTokens as never,
      resetTokens as never,
      mailer as never,
    );
  });

  describe('login', () => {
    it('issues tokens on valid credentials', async () => {
      users.findByEmailInTenant.mockResolvedValue(buildUser());
      hasher.verify.mockResolvedValue(true);

      const result = await service.login('maria@example.com', 'Str0ng!Pass');

      expect(result.accessToken).toBe('a');
      expect(tokens.issueTokens).toHaveBeenCalledWith({
        id: 'user-1',
        tenantId: TENANT,
        role: Role.CONSUMER,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login.succeeded' }),
      );
    });

    it('throws and audits on wrong password', async () => {
      users.findByEmailInTenant.mockResolvedValue(buildUser());
      hasher.verify.mockResolvedValue(false);

      await expect(
        service.login('maria@example.com', 'bad'),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login.failed' }),
      );
    });

    it('performs a dummy verify when the user is unknown (no enumeration)', async () => {
      users.findByEmailInTenant.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(false);

      await expect(service.login('ghost@x.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
      // hash() called to build the dummy hash, verify() still invoked.
      expect(hasher.hash).toHaveBeenCalled();
      expect(hasher.verify).toHaveBeenCalled();
    });

    it('rejects a blocked user', async () => {
      users.findByEmailInTenant.mockResolvedValue(
        buildUser({ status: 'BLOCKED' }),
      );
      hasher.verify.mockResolvedValue(true);
      await expect(
        service.login('maria@example.com', 'x'),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('requires a tenant context', async () => {
      tenantContext.get.mockReturnValue(null);
      await expect(service.login('a@b.com', 'x')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('refresh', () => {
    it('rotates and re-issues for an active user', async () => {
      tokens.rotate.mockResolvedValue({ userId: 'user-1', tenantId: TENANT });
      users.findById.mockResolvedValue(buildUser());

      const result = await service.refresh('r');
      expect(result.refreshToken).toBe('r');
      expect(tokens.issueTokens).toHaveBeenCalled();
    });

    it('rejects when the user no longer exists', async () => {
      tokens.rotate.mockResolvedValue({ userId: 'user-1', tenantId: TENANT });
      users.findById.mockResolvedValue(null);
      await expect(service.refresh('r')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });
  });

  describe('forgotPassword', () => {
    it('creates a reset token and emails it when the user exists', async () => {
      users.findByEmailInTenant.mockResolvedValue(buildUser());
      opaque.generate.mockReturnValue({
        id: 'tok-1',
        token: 'tok-1.secret',
        secretHash: 'h',
      });

      await service.forgotPassword('maria@example.com');
      expect(resetTokens.create).toHaveBeenCalled();
      expect(mailer.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ resetToken: 'tok-1.secret' }),
      );
    });

    it('does nothing observable when the user does not exist', async () => {
      users.findByEmailInTenant.mockResolvedValue(null);
      await service.forgotPassword('ghost@x.com');
      expect(resetTokens.create).not.toHaveBeenCalled();
      expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const validStored = {
      id: 'tok-1',
      userId: 'user-1',
      tenantId: TENANT,
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 10000),
      usedAt: null,
    };

    it('updates the password and invalidates sessions on a valid token', async () => {
      opaque.parse.mockReturnValue({ id: 'tok-1', secret: 's' });
      opaque.verify.mockReturnValue(true);
      resetTokens.findById.mockResolvedValue(validStored);

      await service.resetPassword('tok-1.s', 'NewStr0ng!Pass');

      expect(users.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'new-hash',
        {},
      );
      expect(resetTokens.markUsed).toHaveBeenCalledWith('tok-1');
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects a used token', async () => {
      opaque.parse.mockReturnValue({ id: 'tok-1', secret: 's' });
      resetTokens.findById.mockResolvedValue({
        ...validStored,
        usedAt: new Date(),
      });
      await expect(
        service.resetPassword('tok-1.s', 'NewStr0ng!Pass'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects a token with a bad secret', async () => {
      opaque.parse.mockReturnValue({ id: 'tok-1', secret: 'bad' });
      opaque.verify.mockReturnValue(false);
      resetTokens.findById.mockResolvedValue(validStored);
      await expect(
        service.resetPassword('tok-1.bad', 'NewStr0ng!Pass'),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
