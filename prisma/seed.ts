import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

/**
 * Idempotent development seed: creates one demo restaurant with an admin and a
 * consumer. Mirrors the app's RLS pattern by pinning `app.current_tenant_id` inside
 * a transaction before inserting tenant-scoped rows.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const slug = 'demo-pizzaria';
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    process.stdout.write(`Seed skipped: tenant "${slug}" already exists\n`);
    return;
  }

  const tenantId = randomUUID();
  const adminHash = await argon2.hash('Str0ng!Pass', { type: argon2.argon2id });
  const consumerHash = await argon2.hash('Consumer1!Pass', {
    type: argon2.argon2id,
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    await tx.tenant.create({
      data: { id: tenantId, slug, name: 'Demo Pizzaria', plan: 'PRO' },
    });
    await tx.user.create({
      data: {
        tenantId,
        email: 'owner@demo-pizzaria.com',
        passwordHash: adminHash,
        role: 'TENANT_ADMIN',
      },
    });
    const consumerUser = await tx.user.create({
      data: {
        tenantId,
        email: 'maria@example.com',
        passwordHash: consumerHash,
        role: 'CONSUMER',
      },
    });
    await tx.consumer.create({
      data: {
        tenantId,
        userId: consumerUser.id,
        name: 'Maria Silva',
        phone: '5511999998888',
      },
    });
  });

  process.stdout.write(`Seed complete: tenant "${slug}" (${tenantId})\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
