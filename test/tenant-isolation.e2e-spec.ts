import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createE2EApp, resetDatabase } from './helpers/e2e-app';

const API = '/api/v1';
const STRONG = 'Str0ng!Pass';

/**
 * Proves multi-tenant isolation end-to-end, at both the API layer and the database
 * (Row-Level Security) layer.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    const ctx = await createE2EApp();
    app = ctx.app;
    prisma = ctx.prisma;
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function seedTenantWithConsumer(slug: string, email: string) {
    await http()
      .post(`${API}/tenants`)
      .send({
        name: slug,
        slug,
        adminEmail: `owner@${slug}.com`,
        adminPassword: STRONG,
      })
      .expect(201);
    await http()
      .post(`${API}/consumers`)
      .set('X-Tenant-Slug', slug)
      .send({ email, password: STRONG, name: 'User', phone: '5511999998888' })
      .expect(201);
    const login = await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', slug)
      .send({ email, password: STRONG })
      .expect(200);
    return login.body.accessToken as string;
  }

  it('scopes the same email to different tenants and issues distinct identities', async () => {
    const tokenA = await seedTenantWithConsumer('tenant-a', 'same@example.com');
    const tokenB = await seedTenantWithConsumer('tenant-b', 'same@example.com');

    const meA = await http()
      .get(`${API}/consumers/me`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const meB = await http()
      .get(`${API}/consumers/me`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    // Same email, but two independent consumer records in two tenants.
    expect(meA.body.id).not.toBe(meB.body.id);
  });

  it("a tenant's token cannot see another tenant's addresses", async () => {
    const tokenA = await seedTenantWithConsumer('tenant-a', 'a@example.com');
    const tokenB = await seedTenantWithConsumer('tenant-b', 'b@example.com');

    await http()
      .post(`${API}/consumers/me/addresses`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        label: 'Casa',
        cep: '01001-000',
        number: '10',
        street: 'Rua A',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      })
      .expect(201);

    // Tenant B lists its own addresses — must not include tenant A's.
    const listB = await http()
      .get(`${API}/consumers/me/addresses`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body).toHaveLength(0);
  });

  it('enforces isolation at the database (RLS) layer directly', async () => {
    await seedTenantWithConsumer('tenant-a', 'a@example.com');
    await seedTenantWithConsumer('tenant-b', 'b@example.com');

    const tenants = await prisma.tenant.findMany();
    const a = tenants.find((t) => t.slug === 'tenant-a')!;
    const b = tenants.find((t) => t.slug === 'tenant-b')!;

    // Pinned to tenant A, only A's users are visible.
    const seenByA = await prisma.withTenant(a.id, (tx) => tx.user.findMany());
    expect(seenByA.every((u) => u.tenantId === a.id)).toBe(true);
    expect(seenByA.some((u) => u.tenantId === b.id)).toBe(false);

    // With no tenant pinned, RLS denies everything (safe default).
    const seenWithoutContext = await prisma.user.findMany();
    expect(seenWithoutContext).toHaveLength(0);
  });
});
