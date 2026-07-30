import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configures the OpenAPI (Swagger) document and serves the interactive UI at
 * `/{prefix}/docs`. The JSON spec is available at `/{prefix}/docs-json`.
 */
export function setupSwagger(app: INestApplication, prefix: string): void {
  const config = new DocumentBuilder()
    .setTitle('Restaurant SaaS API')
    .setDescription(
      'Multi-tenant e-commerce API for restaurants. All tenant-scoped routes ' +
        'require either a Bearer access token or an X-Tenant-Slug header.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'X-Tenant-Slug',
      in: 'header',
      required: false,
      description: 'Tenant (restaurant) slug for public tenant-scoped routes.',
      schema: { type: 'string' },
    })
    .addTag('health')
    .addTag('auth')
    .addTag('tenants')
    .addTag('consumers')
    .addTag('addresses')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
