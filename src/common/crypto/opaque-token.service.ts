import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'crypto';

export interface GeneratedOpaqueToken {
  /** Public id used to look up the stored row. */
  id: string;
  /** The full token handed to the client: `<id>.<secret>`. Never stored. */
  token: string;
  /** SHA-256 hash of the secret, safe to persist. */
  secretHash: string;
}

/**
 * Issues and verifies opaque bearer tokens of the form `<id>.<secret>`, used for
 * refresh tokens and password-reset tokens. The lookup id keeps verification O(1)
 * (no need to scan salted hashes), while only a SHA-256 hash of the high-entropy
 * secret is persisted. SHA-256 is appropriate here (not Argon2) because the secret
 * is 256 bits of randomness, not a low-entropy password.
 */
@Injectable()
export class OpaqueTokenService {
  generate(): GeneratedOpaqueToken {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    return {
      id,
      token: `${id}.${secret}`,
      secretHash: this.hashSecret(secret),
    };
  }

  /** Splits a client token into its id and secret parts, or null if malformed. */
  parse(token: string): { id: string; secret: string } | null {
    const separator = token.indexOf('.');
    if (separator <= 0 || separator === token.length - 1) {
      return null;
    }
    return {
      id: token.slice(0, separator),
      secret: token.slice(separator + 1),
    };
  }

  hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /** Constant-time comparison of a presented secret against a stored hash. */
  verify(secret: string, storedHash: string): boolean {
    const candidate = Buffer.from(this.hashSecret(secret), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    if (candidate.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(candidate, expected);
  }
}
