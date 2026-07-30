# ADR 0002 — Multi-tenancy via shared database + Row-Level Security

- **Status:** Accepted
- **Date:** 2026-07-30

## Context

Each restaurant (tenant) must have complete data isolation — no tenant may ever read
or write another tenant's data — while the platform scales to thousands of tenants at
low operational cost.

## Decision

Use a **shared database** where every tenant-scoped table carries a `tenantId`
column, and enforce isolation in **two layers**:

1. **Application layer** — a request-scoped `TenantContext` (AsyncLocalStorage via
   `nestjs-cls`) holds the active tenant, resolved from the JWT claim for
   authenticated routes and from the `X-Tenant-Slug` header for public tenant-scoped
   routes. The JWT claim overrides any header value.
2. **Database layer** — PostgreSQL **Row-Level Security** policies on
   `users`, `consumers` and `addresses` restrict every row to
   `tenantId = current_setting('app.current_tenant_id')`. That GUC is set inside the
   short transaction opened by `PrismaService.withTenant()`. When unset,
   `current_tenant_id()` is `NULL` and no rows match — the safe default is *deny*.

The application connects as a **non-superuser without `BYPASSRLS`**, and tables use
`FORCE ROW LEVEL SECURITY`, so policies apply to the table owner too.

The `tenants` registry itself is intentionally **not** RLS-restricted: resolving
`slug → id` must happen before any tenant context exists, and it holds only
restaurant metadata (all sensitive data lives in the locked tables).

## Alternatives considered

- **Schema-per-tenant / database-per-tenant** — stronger physical isolation, but
  migrations and connection management do not scale to thousands of tenants without
  significant operational complexity.

## Consequences

- Isolation is enforced even if application code forgets a `where tenantId` clause —
  the database refuses cross-tenant access. This is verified by an e2e test.
- Every tenant-scoped DB operation runs inside a short transaction that pins the GUC
  (a minor, acceptable overhead). Operations that legitimately span tenants
  (onboarding, slug/token resolution) use the base client explicitly.
