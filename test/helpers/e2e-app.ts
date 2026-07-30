import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import {
  MAILER,
  MailerPort,
  PasswordResetEmail,
} from '../../src/common/mailer/mailer.port';
import { PrismaService } from '../../src/database/prisma.service';

/** Test mailer that captures the last password-reset email instead of sending it. */
export class CapturingMailer implements MailerPort {
  lastReset: PasswordResetEmail | null = null;
  async sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    this.lastReset = email;
  }
}

export interface E2EContext {
  app: INestApplication;
  prisma: PrismaService;
  mailer: CapturingMailer;
}

/** Boots the full application with the same global config as production main.ts. */
export async function createE2EApp(): Promise<E2EContext> {
  const mailer = new CapturingMailer();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MAILER)
    .useValue(mailer)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return { app, prisma: app.get(PrismaService), mailer };
}

/** Removes all rows between tests. TRUNCATE is an owner-level op, unaffected by RLS. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "audit_logs","password_reset_tokens","refresh_tokens","addresses","consumers","users","tenants" RESTART IDENTITY CASCADE',
  );
}
