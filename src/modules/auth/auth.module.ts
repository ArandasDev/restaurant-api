import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthTokenService } from './application/auth-token.service';
import { AuthService } from './application/auth.service';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from './domain/token.repository';
import {
  PrismaPasswordResetTokenRepository,
  PrismaRefreshTokenRepository,
} from './infrastructure/prisma-token.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwt = configService.getOrThrow<JwtConfig>('jwt');
        return {
          secret: jwt.accessSecret,
          signOptions: { expiresIn: jwt.accessTtl },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    JwtStrategy,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
  ],
  exports: [AuthTokenService],
})
export class AuthModule {}
