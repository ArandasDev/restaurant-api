import { Role } from '../../../common/enums/role.enum';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { ConsumerService } from './consumer.service';

const TENANT = 'tenant-1';

describe('ConsumerService', () => {
  let prisma: { withTenant: jest.Mock };
  let tenantContext: { get: jest.Mock };
  let hasher: { hash: jest.Mock };
  let audit: { record: jest.Mock };
  let users: {
    findByEmailInTenant: jest.Mock;
    create: jest.Mock;
    softDelete: jest.Mock;
  };
  let consumers: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let service: ConsumerService;

  beforeEach(() => {
    prisma = { withTenant: jest.fn((_t, fn) => fn({})) };
    tenantContext = { get: jest.fn().mockReturnValue(TENANT) };
    hasher = { hash: jest.fn().mockResolvedValue('hash') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    users = {
      findByEmailInTenant: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    consumers = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'consumer-1', userId: 'user-1' }),
      findByUserId: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'consumer-1', name: 'New' }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    service = new ConsumerService(
      prisma as never,
      tenantContext as never,
      hasher as never,
      audit as never,
      users as never,
      consumers as never,
    );
  });

  const registerCmd = {
    email: 'maria@example.com',
    password: 'Str0ng!Pass',
    name: 'Maria',
    phone: '5511999998888',
  };

  it('registers a CONSUMER user + profile', async () => {
    users.findByEmailInTenant.mockResolvedValue(null);
    const result = await service.register(registerCmd);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.CONSUMER, tenantId: TENANT }),
      {},
    );
    expect(result.id).toBe('consumer-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consumer.registered' }),
    );
  });

  it('rejects a duplicate email', async () => {
    users.findByEmailInTenant.mockResolvedValue({ id: 'existing' });
    await expect(service.register(registerCmd)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(users.create).not.toHaveBeenCalled();
  });

  it('requires tenant context to register', async () => {
    tenantContext.get.mockReturnValue(null);
    await expect(service.register(registerCmd)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('returns the profile for an existing consumer', async () => {
    consumers.findByUserId.mockResolvedValue({ id: 'consumer-1' });
    await expect(service.getProfile('user-1')).resolves.toMatchObject({
      id: 'consumer-1',
    });
  });

  it('throws NotFound for a missing profile', async () => {
    consumers.findByUserId.mockResolvedValue(null);
    await expect(service.getProfile('ghost')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('soft-deletes both consumer and user on account deletion', async () => {
    consumers.findByUserId.mockResolvedValue({ id: 'consumer-1' });
    await service.deleteAccount('user-1');
    expect(consumers.softDelete).toHaveBeenCalledWith('consumer-1', {});
    expect(users.softDelete).toHaveBeenCalledWith('user-1', {});
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'consumer.deleted' }),
    );
  });
});
