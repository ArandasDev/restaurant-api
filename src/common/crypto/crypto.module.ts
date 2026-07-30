import { Global, Module } from '@nestjs/common';
import { OpaqueTokenService } from './opaque-token.service';
import { PasswordHasherService } from './password-hasher.service';

/** Shared cryptographic primitives (password hashing, opaque tokens). */
@Global()
@Module({
  providers: [PasswordHasherService, OpaqueTokenService],
  exports: [PasswordHasherService, OpaqueTokenService],
})
export class CryptoModule {}
