import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  // Security headers.
  app.use(helmet());
  app.enableCors({
    origin: appConfig.corsOrigins.includes('*') ? true : appConfig.corsOrigins,
    credentials: true,
  });

  // URI versioning: /api/v1/...
  app.setGlobalPrefix(appConfig.globalPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global input validation & sanitisation (anti mass-assignment).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();
  setupSwagger(app, appConfig.globalPrefix);

  await app.listen(appConfig.port);
  const logger = app.get(Logger);
  logger.log(
    `Restaurant API listening on port ${appConfig.port} (${appConfig.nodeEnv})`,
    'Bootstrap',
  );
}

void bootstrap();
