import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ClsMiddleware, ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './common/audit/audit.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MailerModule } from './common/mailer/mailer.module';
import {
  AppConfig,
  ThrottleConfig,
  configuration,
} from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsumersModule } from './modules/consumers/consumers.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantResolutionMiddleware } from './tenancy/tenant-resolution.middleware';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const app = configService.getOrThrow<AppConfig>('app');
        return {
          pinoHttp: {
            level: app.logLevel,
            // Never log Authorization headers or cookies.
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            transport:
              app.nodeEnv === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
          },
        };
      },
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: false } }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttle = configService.getOrThrow<ThrottleConfig>('throttle');
        return {
          throttlers: [{ ttl: throttle.ttl * 1000, limit: throttle.limit }],
        };
      },
    }),
    PrismaModule,
    TenancyModule,
    CryptoModule,
    AuditModule,
    MailerModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    ConsumersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // ClsMiddleware first sets up the request-scoped store; tenant resolution then
    // populates it from X-Tenant-Slug before guards/handlers run.
    consumer.apply(ClsMiddleware, TenantResolutionMiddleware).forRoutes('*');
  }
}
