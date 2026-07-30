export interface CreateTokenData {
  id: string;
  userId: string;
  tenantId: string | null;
  tokenHash: string;
  expiresAt: Date;
}

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tenantId: string | null;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface StoredResetToken {
  id: string;
  userId: string;
  tenantId: string | null;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface RefreshTokenRepository {
  create(data: CreateTokenData): Promise<void>;
  findById(id: string): Promise<StoredRefreshToken | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export interface PasswordResetTokenRepository {
  create(data: CreateTokenData): Promise<void>;
  findById(id: string): Promise<StoredResetToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol(
  'PASSWORD_RESET_TOKEN_REPOSITORY',
);
