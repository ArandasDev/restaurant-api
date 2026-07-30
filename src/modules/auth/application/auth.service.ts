import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtConfig } from '../../../config/configuration';
import { AuditService } from '../../../common/audit/audit.service';
import { OpaqueTokenService } from '../../../common/crypto/opaque-token.service';
import { PasswordHasherService } from '../../../common/crypto/password-hasher.service';
import {
  UnauthorizedError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { MAILER, MailerPort } from '../../../common/mailer/mailer.port';
import { PrismaService } from '../../../database/prisma.service';
import { TenantContextService } from '../../../tenancy/tenant-context.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../users/domain/user.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../domain/token.repository';
import { AuthTokenService, IssuedTokens } from './auth-token.service';

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly hasher: PasswordHasherService,
    private readonly opaque: OpaqueTokenService,
    private readonly tokens: AuthTokenService,
    private readonly audit: AuditService,
    configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(MAILER) private readonly mailer: MailerPort,
  ) {
    this.jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
  }

  async login(
    email: string,
    password: string,
    ip?: string,
  ): Promise<IssuedTokens> {
    const tenantId = this.requireTenant();
    const user = await this.prisma.withTenant(tenantId, (tx) =>
      this.users.findByEmailInTenant(tenantId, email, tx),
    );

    // Verify against a real or dummy hash either way to avoid user enumeration
    // via response timing.
    const passwordOk = user
      ? await this.hasher.verify(user.passwordHash, password)
      : await this.hasher.verify(await this.dummyHash(), password);

    if (!user || user.status !== 'ACTIVE' || !passwordOk) {
      await this.audit.record({
        action: 'auth.login.failed',
        resource: 'user',
        tenantId,
        metadata: { email },
        ip,
      });
      throw new UnauthorizedError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    await this.audit.record({
      action: 'auth.login.succeeded',
      resource: 'user',
      tenantId,
      actorUserId: user.id,
      ip,
    });

    return this.tokens.issueTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    const { userId, tenantId } = await this.tokens.rotate(refreshToken);
    if (!tenantId) {
      throw new UnauthorizedError(
        'AUTH_INVALID_REFRESH_TOKEN',
        'Invalid or expired refresh token',
      );
    }
    const user = await this.prisma.withTenant(tenantId, (tx) =>
      this.users.findById(userId, tx),
    );
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError(
        'AUTH_INVALID_REFRESH_TOKEN',
        'Invalid or expired refresh token',
      );
    }
    return this.tokens.issueTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async forgotPassword(email: string, ip?: string): Promise<void> {
    const tenantId = this.tenantContext.get();
    // Always respond identically regardless of account existence (no enumeration).
    if (!tenantId) {
      return;
    }
    const user = await this.prisma.withTenant(tenantId, (tx) =>
      this.users.findByEmailInTenant(tenantId, email, tx),
    );
    if (!user) {
      return;
    }

    const generated = this.opaque.generate();
    await this.resetTokens.create({
      id: generated.id,
      userId: user.id,
      tenantId,
      tokenHash: generated.secretHash,
      expiresAt: new Date(Date.now() + this.jwtConfig.passwordResetTtl * 1000),
    });
    await this.mailer.sendPasswordReset({
      to: user.email,
      tenantId,
      resetToken: generated.token,
    });
    await this.audit.record({
      action: 'auth.password.reset_requested',
      resource: 'user',
      tenantId,
      actorUserId: user.id,
      ip,
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
  ): Promise<void> {
    const parsed = this.opaque.parse(token);
    const stored = parsed ? await this.resetTokens.findById(parsed.id) : null;
    if (
      !parsed ||
      !stored ||
      stored.usedAt !== null ||
      stored.expiresAt.getTime() <= Date.now() ||
      !stored.tenantId ||
      !this.opaque.verify(parsed.secret, stored.tokenHash)
    ) {
      throw new ValidationError(
        'AUTH_INVALID_RESET_TOKEN',
        'Invalid or expired password reset token',
      );
    }

    const passwordHash = await this.hasher.hash(newPassword);
    await this.prisma.withTenant(stored.tenantId, (tx) =>
      this.users.updatePassword(stored.userId, passwordHash, tx),
    );
    await this.resetTokens.markUsed(stored.id);
    // Invalidate existing sessions and any other outstanding reset tokens.
    await this.refreshTokens.revokeAllForUser(stored.userId);
    await this.resetTokens.invalidateAllForUser(stored.userId);
    await this.audit.record({
      action: 'auth.password.reset_completed',
      resource: 'user',
      tenantId: stored.tenantId,
      actorUserId: stored.userId,
      ip,
    });
  }

  private requireTenant(): string {
    const tenantId = this.tenantContext.get();
    if (!tenantId) {
      throw new ValidationError(
        'TENANT_REQUIRED',
        'X-Tenant-Slug header is required for this operation',
      );
    }
    return tenantId;
  }

  private dummyHashCache?: string;
  private async dummyHash(): Promise<string> {
    if (!this.dummyHashCache) {
      this.dummyHashCache = await this.hasher.hash(
        'dummy-password-placeholder',
      );
    }
    return this.dummyHashCache;
  }
}
