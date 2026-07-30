import { Role } from '../../../common/enums/role.enum';
import { ConflictError } from '../../../common/errors/domain-error';
import { CreateTenantUseCase } from './create-tenant.use-case';

describe('CreateTenantUseCase', () => {
  let prisma: { withTenant: jest.Mock };
  let hasher: { hash: jest.Mock };
  let audit: { record: jest.Mock };
  let tenants: { existsBySlug: jest.Mock; create: jest.Mock };
  let users: { create: jest.Mock };
  let useCase: CreateTenantUseCase;

  beforeEach(() => {
    prisma = { withTenant: jest.fn((_t, fn) => fn({})) };
    hasher = { hash: jest.fn().mockResolvedValue('hash') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    tenants = {
      existsBySlug: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ id: 't1' }),
    };
    users = { create: jest.fn().mockResolvedValue({ id: 'admin-1' }) };
    useCase = new CreateTenantUseCase(
      prisma as never,
      hasher as never,
      audit as never,
      tenants as never,
      users as never,
    );
  });

  const cmd = {
    name: 'Pizzaria',
    slug: 'pizzaria',
    adminEmail: 'owner@pizzaria.com',
    adminPassword: 'Str0ng!Pass',
  };

  it('creates a tenant and its TENANT_ADMIN atomically', async () => {
    const result = await useCase.execute(cmd);

    expect(result.slug).toBe('pizzaria');
    expect(result.adminUserId).toBe('admin-1');
    // The tenant id used to pin the tx equals the created tenant id.
    const [pinnedTenantId] = prisma.withTenant.mock.calls[0];
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: pinnedTenantId,
        role: Role.TENANT_ADMIN,
      }),
      {},
    );
    expect(result.id).toBe(pinnedTenantId);
  });

  it('rejects a taken slug before writing anything', async () => {
    tenants.existsBySlug.mockResolvedValue(true);
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.withTenant).not.toHaveBeenCalled();
  });
});
