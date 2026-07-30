# Restaurant SaaS API

Multi-tenant e-commerce REST API for restaurants (pizzerias, burger joints, cafés,
etc.), built with **NestJS + TypeScript + PostgreSQL (Prisma)**. Designed for
thousands of tenants with Clean Architecture, strong tenant isolation, and a
security-first posture.

> **Delivery 1 (this repository state):** foundation + authentication + tenant
> onboarding + consumers (profile & addresses). Catalog, orders, delivery, finance,
> inventory and analytics are planned for subsequent deliveries and reuse this
> foundation. See [`docs/adr`](docs/adr) for the reasoning behind key decisions.

## Table of contents

- [Architecture](#architecture)
- [Multi-tenancy & security](#multi-tenancy--security)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API documentation](#api-documentation)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Git workflow](#git-workflow)

## Architecture

Each feature module is organised in layers following **Clean Architecture**, so
dependencies always point inward and business logic stays framework-agnostic:

| Layer            | Responsibility                                              |
| ---------------- | ----------------------------------------------------------- |
| `domain/`        | Entities, value objects, repository **ports**, domain errors |
| `application/`   | Use cases / application services, orchestration              |
| `infrastructure/`| Prisma repositories, external adapters (CEP, mailer)         |
| `presentation/`  | Controllers, request/response DTOs, validation               |

Cross-cutting concerns live under `src/common` (guards, filters, decorators,
crypto, audit, mailer, validation) and `src/tenancy` (tenant context).

## Multi-tenancy & security

- **Shared database + `tenant_id`** on every tenant-scoped table.
- **Two isolation layers (defense-in-depth):**
  1. **Application** — a request-scoped `TenantContext` (AsyncLocalStorage via
     `nestjs-cls`) resolved from the JWT claim (authenticated routes) or the
     `X-Tenant-Slug` header (public tenant routes). The JWT claim always wins, so a
     token for tenant A can never be pointed at tenant B.
  2. **Database** — PostgreSQL **Row-Level Security** policies scope every read/write
     to the tenant pinned on the connection (`app.current_tenant_id`), set inside the
     short transaction opened by `PrismaService.withTenant()`. With no tenant pinned,
     RLS returns nothing (safe default). This holds even if application code has a bug.
     > The app connects as a **non-superuser without `BYPASSRLS`**, and tables use
     > `FORCE ROW LEVEL SECURITY`, so the policies are genuinely enforced.

Other security measures: **Argon2id** password hashing, JWT access tokens + rotating,
hashed **refresh tokens** (revocable sessions), single-use password-reset tokens,
**RBAC** (`@Roles`), rate limiting (`@nestjs/throttler`), **Helmet**, configurable
**CORS**, global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` → sanitisation
and anti mass-assignment), parameterised queries (Prisma) against SQL injection,
an append-only **audit log** for sensitive actions, a password policy, and
secrets supplied exclusively via validated environment variables.

## Getting started

### With Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
# API on http://localhost:3000/api/v1 — Swagger UI on http://localhost:3000/api/docs
```

### Local development

Requires Node 22+ and a PostgreSQL 16 instance. The application role must be a
**non-superuser without `BYPASSRLS`** for RLS to be enforced:

```sql
CREATE ROLE restaurant LOGIN PASSWORD 'restaurant' NOSUPERUSER NOCREATEDB NOBYPASSRLS;
CREATE DATABASE restaurant_dev OWNER restaurant;
CREATE DATABASE restaurant_test OWNER restaurant;
```

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate        # applies schema + RLS policies
npm run start:dev
```

## Configuration

All configuration comes from environment variables, validated at boot (the app
refuses to start with missing/weak secrets). See [`.env.example`](.env.example) for
the full list. Key variables:

| Variable                             | Description                                     |
| ------------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`                       | Postgres connection (non-superuser role)        |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets (≥ 32 chars)          |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes in seconds                      |
| `CORS_ORIGINS`                       | Comma-separated allowed origins (`*` for any)   |
| `THROTTLE_*` / `AUTH_THROTTLE_*`     | Rate-limit windows and limits                   |

## API documentation

- **Swagger UI:** `GET /api/docs`
- **OpenAPI JSON:** `GET /api/docs-json` (a snapshot is committed at
  [`docs/openapi.json`](docs/openapi.json); regenerate with `npm run openapi:export`)
- **Error format & catalog:** [`docs/ERRORS.md`](docs/ERRORS.md)

### Example: onboard a tenant, register and authenticate a consumer

```bash
# 1. Onboard a restaurant (creates the tenant + its TENANT_ADMIN)
curl -X POST http://localhost:3000/api/v1/tenants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pizzaria do Bairro","slug":"pizzaria","adminEmail":"owner@pizzaria.com","adminPassword":"Str0ng!Pass"}'

# 2. Register a consumer at that restaurant (tenant via X-Tenant-Slug)
curl -X POST http://localhost:3000/api/v1/consumers \
  -H 'Content-Type: application/json' -H 'X-Tenant-Slug: pizzaria' \
  -d '{"email":"maria@example.com","password":"Str0ng!Pass","name":"Maria Silva","phone":"5511999998888"}'

# 3. Log in → returns { accessToken, refreshToken, ... }
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' -H 'X-Tenant-Slug: pizzaria' \
  -d '{"email":"maria@example.com","password":"Str0ng!Pass"}'

# 4. Use the access token
curl http://localhost:3000/api/v1/consumers/me -H "Authorization: Bearer <accessToken>"
```

## Testing

```bash
npm test            # unit tests
npm run test:cov    # unit tests + coverage (min 80% lines, enforced)
npm run test:e2e    # end-to-end tests (needs restaurant_test DB)
```

The e2e suite includes a **tenant-isolation** spec that proves, both through the API
and directly at the database, that one tenant cannot read another tenant's data and
that queries with no tenant context return nothing.

## Project layout

```
src/
  common/        cross-cutting: guards, filters, decorators, crypto, audit, mailer, validation
  config/        env validation + typed configuration
  database/      PrismaService (RLS-aware withTenant) + module
  tenancy/       tenant context + resolution middleware
  modules/
    auth/        login, refresh (rotation), logout, forgot/reset password
    users/       authentication identity (User) + repository
    tenants/     restaurant onboarding
    consumers/   consumer profile + addresses (CEP lookup, primary address)
  health/        liveness/readiness probe
prisma/          schema + migrations (incl. RLS policies)
test/            e2e specs + helpers
docs/            ADRs, error catalog, OpenAPI snapshot
```

## Git workflow

`main` (production) ← `development` (integration) ← short-lived branches
(`feat/*`, `fix/*`, `refactor/*`, `test/*`, `docs/*`, `chore/*`, …).
`main` never receives direct development; a change reaches it only via
`development` once tests pass, coverage is met and docs are updated. Commits follow
the Conventional Commits style (`feat(auth): …`, `test(consumers): …`).
