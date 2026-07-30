import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id password hashing. Argon2id is the OWASP-recommended default: memory-hard
 * and resistant to both GPU and side-channel attacks. Parameters are conservative
 * defaults suitable for interactive logins.
 */
@Injectable()
export class PasswordHasherService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
