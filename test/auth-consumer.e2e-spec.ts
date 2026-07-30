import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import {
  CapturingMailer,
  createE2EApp,
  resetDatabase,
} from './helpers/e2e-app';

const API = '/api/v1';
const STRONG = 'Str0ng!Pass';

describe('Auth + Consumers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: CapturingMailer;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    const ctx = await createE2EApp();
    app = ctx.app;
    prisma = ctx.prisma;
    mailer = ctx.mailer;
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function onboardTenant(slug = 'pizzaria') {
    const res = await http()
      .post(`${API}/tenants`)
      .send({
        name: 'Pizzaria',
        slug,
        adminEmail: `owner@${slug}.com`,
        adminPassword: STRONG,
      })
      .expect(201);
    return res.body;
  }

  async function registerAndLogin(
    slug = 'pizzaria',
    email = 'maria@example.com',
  ) {
    await http()
      .post(`${API}/consumers`)
      .set('X-Tenant-Slug', slug)
      .send({ email, password: STRONG, name: 'Maria', phone: '5511999998888' })
      .expect(201);
    const login = await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', slug)
      .send({ email, password: STRONG })
      .expect(200);
    return login.body as { accessToken: string; refreshToken: string };
  }

  it('onboards a tenant with its admin', async () => {
    const tenant = await onboardTenant();
    expect(tenant.slug).toBe('pizzaria');
    expect(tenant.adminUserId).toBeDefined();
  });

  it('rejects a duplicate slug with 409', async () => {
    await onboardTenant();
    await http()
      .post(`${API}/tenants`)
      .send({
        name: 'Other',
        slug: 'pizzaria',
        adminEmail: 'x@y.com',
        adminPassword: STRONG,
      })
      .expect(409);
  });

  it('rejects weak passwords with 400', async () => {
    await http()
      .post(`${API}/tenants`)
      .send({
        name: 'X',
        slug: 'x',
        adminEmail: 'a@b.com',
        adminPassword: 'weak',
      })
      .expect(400);
  });

  it('registers, logs in, and reads own profile', async () => {
    await onboardTenant();
    const { accessToken } = await registerAndLogin();

    const me = await http()
      .get(`${API}/consumers/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.name).toBe('Maria');
  });

  it('rejects login with wrong password (401)', async () => {
    await onboardTenant();
    await registerAndLogin();
    await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', 'pizzaria')
      .send({ email: 'maria@example.com', password: 'WrongPass1!' })
      .expect(401);
  });

  it('requires a bearer token for /consumers/me (401)', async () => {
    await http().get(`${API}/consumers/me`).expect(401);
  });

  it('rotates refresh tokens and rejects reuse', async () => {
    await onboardTenant();
    const { refreshToken } = await registerAndLogin();

    await http().post(`${API}/auth/refresh`).send({ refreshToken }).expect(200);
    // The old token was rotated out.
    await http().post(`${API}/auth/refresh`).send({ refreshToken }).expect(401);
  });

  it('supports the full password reset flow', async () => {
    await onboardTenant();
    await registerAndLogin();

    await http()
      .post(`${API}/auth/forgot-password`)
      .set('X-Tenant-Slug', 'pizzaria')
      .send({ email: 'maria@example.com' })
      .expect(202);

    // The capturing mailer received the raw token that a real user would click.
    const resetToken = mailer.lastReset?.resetToken;
    expect(resetToken).toBeDefined();

    const newPassword = 'BrandNew1!Pass';
    await http()
      .post(`${API}/auth/reset-password`)
      .send({ token: resetToken, newPassword })
      .expect(200);

    // Old password no longer works; the new one does.
    await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', 'pizzaria')
      .send({ email: 'maria@example.com', password: STRONG })
      .expect(401);
    await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', 'pizzaria')
      .send({ email: 'maria@example.com', password: newPassword })
      .expect(200);

    // The reset token is single-use.
    await http()
      .post(`${API}/auth/reset-password`)
      .send({ token: resetToken, newPassword: 'Another1!Pass' })
      .expect(422);
  });

  it('manages addresses with the primary invariant', async () => {
    await onboardTenant();
    const { accessToken } = await registerAndLogin();
    const auth = (r: Test) => r.set('Authorization', `Bearer ${accessToken}`);

    const first = await auth(
      http().post(`${API}/consumers/me/addresses`).send({
        label: 'Casa',
        cep: '01001-000',
        number: '10',
        street: 'Praça da Sé',
        district: 'Sé',
        city: 'São Paulo',
        state: 'SP',
      }),
    ).expect(201);
    expect(first.body.isPrimary).toBe(true);

    const second = await auth(
      http().post(`${API}/consumers/me/addresses`).send({
        label: 'Trabalho',
        cep: '01310-100',
        number: '999',
        street: 'Av Paulista',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        isPrimary: true,
      }),
    ).expect(201);
    expect(second.body.isPrimary).toBe(true);

    const list = await auth(http().get(`${API}/consumers/me/addresses`)).expect(
      200,
    );
    const primaries = list.body.filter(
      (a: { isPrimary: boolean }) => a.isPrimary,
    );
    expect(primaries).toHaveLength(1);
    expect(primaries[0].id).toBe(second.body.id);
  });

  it('soft-deletes the account and blocks subsequent login', async () => {
    await onboardTenant();
    const { accessToken } = await registerAndLogin();

    await http()
      .delete(`${API}/consumers/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await http()
      .post(`${API}/auth/login`)
      .set('X-Tenant-Slug', 'pizzaria')
      .send({ email: 'maria@example.com', password: STRONG })
      .expect(401);
  });
});
