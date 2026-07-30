import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from '../../../config/configuration';
import { OpaqueTokenService } from '../../../common/crypto/opaque-token.service';
import { AccessTokenPayload } from '../../../common/interfaces/authenticated-user';
import { Role } from '../../../common/enums/role.enum';
import { UnauthorizedError } from '../../../common/errors/domain-error';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../domain/token.repository';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface Principal {
  id: string;
  tenantId: string | null;
  role: Role;
}

/**
 * Central token authority: signs short-lived access JWTs and issues/rotates
 * long-lived opaque refresh tokens (persisted hashed, one row per session).
 */
@Injectable()
export class AuthTokenService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwt: JwtService,
    private readonly opaque: OpaqueTokenService,
    configService: ConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {
    this.jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
  }

  async issueTokens(principal: Principal): Promise<IssuedTokens> {
    const accessToken = this.signAccessToken(principal);
    const refreshToken = await this.createRefreshToken(principal);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtConfig.accessTtl,
    };
  }

  /**
   * Validates a presented refresh token, revokes it (rotation), and returns the
   * owning principal so a fresh pair can be issued. Throws on any invalid/expired/
   * reused token.
   */
  async rotate(presentedToken: string): Promise<{
    userId: string;
    tenantId: string | null;
  }> {
    const parsed = this.opaque.parse(presentedToken);
    if (!parsed) {
      throw this.invalid();
    }
    const stored = await this.refreshTokens.findById(parsed.id);
    if (
      !stored ||
      stored.revokedAt !== null ||
      stored.expiresAt.getTime() <= Date.now() ||
      !this.opaque.verify(parsed.secret, stored.tokenHash)
    ) {
      throw this.invalid();
    }
    await this.refreshTokens.revoke(stored.id);
    return { userId: stored.userId, tenantId: stored.tenantId };
  }

  async revoke(presentedToken: string): Promise<void> {
    const parsed = this.opaque.parse(presentedToken);
    if (!parsed) {
      return;
    }
    const stored = await this.refreshTokens.findById(parsed.id);
    if (stored && this.opaque.verify(parsed.secret, stored.tokenHash)) {
      await this.refreshTokens.revoke(stored.id);
    }
  }

  signAccessToken(principal: Principal): string {
    const payload: AccessTokenPayload = {
      sub: principal.id,
      tenantId: principal.tenantId,
      role: principal.role,
    };
    return this.jwt.sign(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl,
    });
  }

  private async createRefreshToken(principal: Principal): Promise<string> {
    const generated = this.opaque.generate();
    await this.refreshTokens.create({
      id: generated.id,
      userId: principal.id,
      tenantId: principal.tenantId,
      tokenHash: generated.secretHash,
      expiresAt: new Date(Date.now() + this.jwtConfig.refreshTtl * 1000),
    });
    return generated.token;
  }

  private invalid(): UnauthorizedError {
    return new UnauthorizedError(
      'AUTH_INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token',
    );
  }
}
