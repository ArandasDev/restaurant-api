import { Inject, Injectable } from '@nestjs/common';
import {
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { TenantContextService } from '../../../tenancy/tenant-context.service';
import {
  ADDRESS_REPOSITORY,
  AddressRepository,
} from '../domain/address.repository';
import { Address } from '../domain/consumer.entity';
import {
  CONSUMER_REPOSITORY,
  ConsumerRepository,
} from '../domain/consumer.repository';
import {
  CEP_LOOKUP,
  CepAddress,
  CepLookupPort,
  normalizeCep,
} from '../domain/cep-lookup.port';

export interface CreateAddressCommand {
  label: string;
  cep: string;
  number: string;
  street?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export type UpdateAddressCommand = Partial<
  Omit<CreateAddressCommand, 'isPrimary'>
>;

/**
 * Address management for the authenticated consumer. Enforces the invariant that a
 * consumer has exactly one primary address, and enriches missing street data from
 * the CEP when possible.
 */
@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: AddressRepository,
    @Inject(CONSUMER_REPOSITORY) private readonly consumers: ConsumerRepository,
    @Inject(CEP_LOOKUP) private readonly cepLookup: CepLookupPort,
  ) {}

  /** Public CEP validation/lookup utility (not tenant-scoped). */
  async lookupCep(cep: string): Promise<CepAddress> {
    const normalized = this.requireValidCep(cep);
    const result = await this.cepLookup.lookup(normalized);
    if (!result) {
      throw new NotFoundError('CEP_NOT_FOUND', 'CEP not found');
    }
    return result;
  }

  list(userId: string): Promise<Address[]> {
    const tenantId = this.requireTenant();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const consumerId = await this.consumerId(userId, tx);
      return this.addresses.listByConsumer(consumerId, tx);
    });
  }

  async create(
    userId: string,
    command: CreateAddressCommand,
  ): Promise<Address> {
    const tenantId = this.requireTenant();
    const resolved = await this.resolveLocation(command);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const consumerId = await this.consumerId(userId, tx);
      const count = await this.addresses.countByConsumer(consumerId, tx);
      // The very first address is always primary; otherwise honour the request.
      const isPrimary = count === 0 ? true : (command.isPrimary ?? false);
      if (isPrimary && count > 0) {
        await this.addresses.clearPrimary(consumerId, tx);
      }
      return this.addresses.create(
        { tenantId, consumerId, isPrimary, ...resolved },
        tx,
      );
    });
  }

  async update(
    userId: string,
    addressId: string,
    command: UpdateAddressCommand,
  ): Promise<Address> {
    const tenantId = this.requireTenant();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const consumerId = await this.consumerId(userId, tx);
      await this.requireAddress(addressId, consumerId, tx);
      const cep = command.cep ? this.requireValidCep(command.cep) : undefined;
      return this.addresses.update(addressId, { ...command, cep }, tx);
    });
  }

  async setPrimary(userId: string, addressId: string): Promise<void> {
    const tenantId = this.requireTenant();
    await this.prisma.withTenant(tenantId, async (tx) => {
      const consumerId = await this.consumerId(userId, tx);
      await this.requireAddress(addressId, consumerId, tx);
      await this.addresses.clearPrimary(consumerId, tx);
      await this.addresses.setPrimary(addressId, tx);
    });
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const tenantId = this.requireTenant();
    await this.prisma.withTenant(tenantId, async (tx) => {
      const consumerId = await this.consumerId(userId, tx);
      const address = await this.requireAddress(addressId, consumerId, tx);
      await this.addresses.delete(addressId, tx);
      // Promote another address to primary so the invariant holds.
      if (address.isPrimary) {
        const remaining = await this.addresses.listByConsumer(consumerId, tx);
        if (remaining.length > 0) {
          await this.addresses.setPrimary(remaining[0].id, tx);
        }
      }
    });
  }

  /** Fills in missing street fields from the CEP; validates required data exists. */
  private async resolveLocation(command: CreateAddressCommand) {
    const cep = this.requireValidCep(command.cep);
    let { street, district, city, state } = command;

    if (!street || !district || !city || !state) {
      const looked = await this.cepLookup.lookup(cep);
      if (looked) {
        street = street || looked.street;
        district = district || looked.district;
        city = city || looked.city;
        state = state || looked.state;
      }
    }

    if (!street || !district || !city || !state) {
      throw new ValidationError(
        'ADDRESS_INCOMPLETE',
        'street, district, city and state are required (CEP lookup did not resolve them)',
      );
    }

    return {
      label: command.label,
      cep,
      number: command.number,
      complement: command.complement ?? null,
      street,
      district,
      city,
      state: state.toUpperCase().slice(0, 2),
      latitude: command.latitude ?? null,
      longitude: command.longitude ?? null,
    };
  }

  private requireValidCep(cep: string): string {
    const normalized = normalizeCep(cep);
    if (!normalized) {
      throw new ValidationError('INVALID_CEP', 'CEP must contain 8 digits');
    }
    return normalized;
  }

  private async consumerId(userId: string, tx: TxClient): Promise<string> {
    const consumer = await this.consumers.findByUserId(userId, tx);
    if (!consumer) {
      throw new NotFoundError(
        'CONSUMER_NOT_FOUND',
        'Consumer profile not found',
      );
    }
    return consumer.id;
  }

  private async requireAddress(
    addressId: string,
    consumerId: string,
    tx: TxClient,
  ): Promise<Address> {
    const address = await this.addresses.findById(addressId, consumerId, tx);
    if (!address) {
      throw new NotFoundError('ADDRESS_NOT_FOUND', 'Address not found');
    }
    return address;
  }

  private requireTenant(): string {
    const tenantId = this.tenantContext.get();
    if (!tenantId) {
      throw new ValidationError(
        'TENANT_REQUIRED',
        'X-Tenant-Slug header is required for this operation',
      );
    }
    return tenantId;
  }
}
