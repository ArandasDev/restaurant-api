import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * Generates docs/openapi.json without starting the HTTP server. Run via
 * `npm run openapi:export`. Used in CI and to keep the committed spec fresh.
 */
async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Restaurant SaaS API')
    .setDescription('Multi-tenant e-commerce API for restaurants.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outDir = join(process.cwd(), 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );
  await app.close();
  process.stdout.write('Wrote docs/openapi.json\n');
}

void generate();
