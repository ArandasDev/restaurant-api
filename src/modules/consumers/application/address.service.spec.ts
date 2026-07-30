import {
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { AddressService } from './address.service';

const TENANT = 'tenant-1';

describe('AddressService', () => {
  let prisma: { withTenant: jest.Mock };
  let tenantContext: { get: jest.Mock };
  let addresses: {
    listByConsumer: jest.Mock;
    findById: jest.Mock;
    countByConsumer: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    clearPrimary: jest.Mock;
    setPrimary: jest.Mock;
  };
  let consumers: { findByUserId: jest.Mock };
  let cepLookup: { lookup: jest.Mock };
  let service: AddressService;

  beforeEach(() => {
    prisma = { withTenant: jest.fn((_t, fn) => fn({})) };
    tenantContext = { get: jest.fn().mockReturnValue(TENANT) };
    addresses = {
      listByConsumer: jest.fn(),
      findById: jest.fn(),
      countByConsumer: jest.fn(),
      create: jest.fn((data) => Promise.resolve({ id: 'addr-new', ...data })),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
      delete: jest.fn().mockResolvedValue(undefined),
      clearPrimary: jest.fn().mockResolvedValue(undefined),
      setPrimary: jest.fn().mockResolvedValue(undefined),
    };
    consumers = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'consumer-1' }),
    };
    cepLookup = { lookup: jest.fn() };
    service = new AddressService(
      prisma as never,
      tenantContext as never,
      addresses as never,
      consumers as never,
      cepLookup as never,
    );
  });

  const fullAddress = {
    label: 'Casa',
    cep: '01001-000',
    number: '10',
    street: 'Praça da Sé',
    district: 'Sé',
    city: 'São Paulo',
    state: 'sp',
  };

  it('makes the first address primary regardless of the request', async () => {
    addresses.countByConsumer.mockResolvedValue(0);
    const result = await service.create('user-1', {
      ...fullAddress,
      isPrimary: false,
    });
    expect(result.isPrimary).toBe(true);
    expect(addresses.clearPrimary).not.toHaveBeenCalled();
    // CEP is normalised and state upper-cased.
    expect(result.cep).toBe('01001000');
    expect(result.state).toBe('SP');
  });

  it('clears the previous primary when a later address is set primary', async () => {
    addresses.countByConsumer.mockResolvedValue(2);
    const result = await service.create('user-1', {
      ...fullAddress,
      isPrimary: true,
    });
    expect(addresses.clearPrimary).toHaveBeenCalledWith('consumer-1', {});
    expect(result.isPrimary).toBe(true);
  });

  it('keeps a later address non-primary by default', async () => {
    addresses.countByConsumer.mockResolvedValue(1);
    const result = await service.create('user-1', fullAddress);
    expect(result.isPrimary).toBe(false);
    expect(addresses.clearPrimary).not.toHaveBeenCalled();
  });

  it('enriches missing street fields from the CEP', async () => {
    addresses.countByConsumer.mockResolvedValue(0);
    cepLookup.lookup.mockResolvedValue({
      cep: '01001000',
      street: 'Praça da Sé',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    });
    const result = await service.create('user-1', {
      label: 'Casa',
      cep: '01001000',
      number: '10',
    });
    expect(cepLookup.lookup).toHaveBeenCalledWith('01001000');
    expect(result.city).toBe('São Paulo');
  });

  it('fails when street data is missing and CEP does not resolve', async () => {
    addresses.countByConsumer.mockResolvedValue(0);
    cepLookup.lookup.mockResolvedValue(null);
    await expect(
      service.create('user-1', {
        label: 'Casa',
        cep: '01001000',
        number: '10',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an invalid CEP without hitting the lookup', async () => {
    addresses.countByConsumer.mockResolvedValue(0);
    await expect(
      service.create('user-1', { ...fullAddress, cep: '123' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(cepLookup.lookup).not.toHaveBeenCalled();
  });

  it('promotes another address to primary when the primary is deleted', async () => {
    addresses.findById.mockResolvedValue({ id: 'addr-1', isPrimary: true });
    addresses.listByConsumer.mockResolvedValue([{ id: 'addr-2' }]);
    await service.remove('user-1', 'addr-1');
    expect(addresses.delete).toHaveBeenCalledWith('addr-1', {});
    expect(addresses.setPrimary).toHaveBeenCalledWith('addr-2', {});
  });

  it('does not promote when a non-primary address is deleted', async () => {
    addresses.findById.mockResolvedValue({ id: 'addr-2', isPrimary: false });
    await service.remove('user-1', 'addr-2');
    expect(addresses.setPrimary).not.toHaveBeenCalled();
  });

  it('throws NotFound when addressing an unknown address', async () => {
    addresses.findById.mockResolvedValue(null);
    await expect(service.setPrimary('user-1', 'nope')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('throws NotFound when the consumer profile is missing', async () => {
    consumers.findByUserId.mockResolvedValue(null);
    await expect(service.list('user-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('lookupCep', () => {
    it('returns the resolved address', async () => {
      cepLookup.lookup.mockResolvedValue({
        cep: '01001000',
        street: 'X',
        district: 'Y',
        city: 'Z',
        state: 'SP',
      });
      await expect(service.lookupCep('01001-000')).resolves.toMatchObject({
        city: 'Z',
      });
    });

    it('throws NotFound when the CEP is unknown', async () => {
      cepLookup.lookup.mockResolvedValue(null);
      await expect(service.lookupCep('01001000')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
