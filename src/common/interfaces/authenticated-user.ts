import { Role } from '../enums/role.enum';

/** Shape of the JWT access-token payload. */
export interface AccessTokenPayload {
  /** Subject — the user id. */
  sub: string;
  /** Tenant the user belongs to (null for platform admins). */
  tenantId: string | null;
  role: Role;
}

/** The authenticated principal attached to the request by JwtStrategy. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string | null;
  role: Role;
}
