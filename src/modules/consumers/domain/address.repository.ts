import { TxClient } from '../../../database/prisma.service';
import { Address } from './consumer.entity';

export interface CreateAddressData {
  tenantId: string;
  consumerId: string;
  label: string;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
}

export type UpdateAddressData = Partial<
  Omit<CreateAddressData, 'tenantId' | 'consumerId' | 'isPrimary'>
>;

export interface AddressRepository {
  listByConsumer(consumerId: string, tx?: TxClient): Promise<Address[]>;
  findById(
    id: string,
    consumerId: string,
    tx?: TxClient,
  ): Promise<Address | null>;
  countByConsumer(consumerId: string, tx?: TxClient): Promise<number>;
  create(data: CreateAddressData, tx?: TxClient): Promise<Address>;
  update(id: string, data: UpdateAddressData, tx?: TxClient): Promise<Address>;
  delete(id: string, tx?: TxClient): Promise<void>;
  /** Clears the primary flag on every address of the consumer. */
  clearPrimary(consumerId: string, tx?: TxClient): Promise<void>;
  setPrimary(id: string, tx?: TxClient): Promise<void>;
}

export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');
