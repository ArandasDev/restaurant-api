import { Injectable } from '@nestjs/common';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { Address } from '../domain/consumer.entity';
import {
  AddressRepository,
  CreateAddressData,
  UpdateAddressData,
} from '../domain/address.repository';

@Injectable()
export class PrismaAddressRepository implements AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: TxClient): TxClient | PrismaService {
    return tx ?? this.prisma;
  }

  async listByConsumer(consumerId: string, tx?: TxClient): Promise<Address[]> {
    const rows = await this.client(tx).address.findMany({
      where: { consumerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return rows as Address[];
  }

  async findById(
    id: string,
    consumerId: string,
    tx?: TxClient,
  ): Promise<Address | null> {
    const row = await this.client(tx).address.findFirst({
      where: { id, consumerId },
    });
    return row as Address | null;
  }

  countByConsumer(consumerId: string, tx?: TxClient): Promise<number> {
    return this.client(tx).address.count({ where: { consumerId } });
  }

  async create(data: CreateAddressData, tx?: TxClient): Promise<Address> {
    const row = await this.client(tx).address.create({ data });
    return row as Address;
  }

  async update(
    id: string,
    data: UpdateAddressData,
    tx?: TxClient,
  ): Promise<Address> {
    const row = await this.client(tx).address.update({ where: { id }, data });
    return row as Address;
  }

  async delete(id: string, tx?: TxClient): Promise<void> {
    await this.client(tx).address.delete({ where: { id } });
  }

  async clearPrimary(consumerId: string, tx?: TxClient): Promise<void> {
    await this.client(tx).address.updateMany({
      where: { consumerId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async setPrimary(id: string, tx?: TxClient): Promise<void> {
    await this.client(tx).address.update({
      where: { id },
      data: { isPrimary: true },
    });
  }
}
