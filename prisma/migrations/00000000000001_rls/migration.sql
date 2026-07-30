-- Row-Level Security (multi-tenant isolation, defense-in-depth).
--
-- The application also filters every query by tenantId; these policies are the
-- second, database-enforced layer that holds even if application code has a bug.
-- The active tenant is carried in the `app.current_tenant_id` session GUC, set via
-- `set_config(..., is_local => true)` inside the per-operation transaction opened by
-- PrismaService.withTenant(). When unset, current_tenant_id() is NULL and no rows
-- match — i.e. the safe default is "deny".
--
-- The `tenants` registry is intentionally NOT restricted: resolving slug -> id must
-- happen before any tenant context exists. It holds only restaurant metadata; all
-- sensitive data lives in the tables locked below.

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "users"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- consumers
ALTER TABLE "consumers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consumers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "consumers"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- addresses
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "addresses"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());
