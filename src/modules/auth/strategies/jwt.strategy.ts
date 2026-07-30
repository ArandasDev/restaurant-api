import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../../config/configuration';
import {
  AccessTokenPayload,
  AuthenticatedUser,
} from '../../../common/interfaces/authenticated-user';
import { TenantContextService } from '../../../tenancy/tenant-context.service';

/**
 * Validates the Bearer access token signature/expiry and maps its claims to the
 * request principal. It also pins the tenant context from the (trusted) token
 * claim, which overrides any client-supplied X-Tenant-Slug — so a token for
 * tenant A can never be aimed at tenant B.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {
    const jwt = configService.getOrThrow<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.tenantId) {
      this.tenantContext.set(payload.tenantId);
    }
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
