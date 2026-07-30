import { Injectable } from '@nestjs/common';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { Consumer } from '../domain/consumer.entity';
import {
  ConsumerRepository,
  CreateConsumerData,
  UpdateConsumerData,
} from '../domain/consumer.repository';

@Injectable()
export class PrismaConsumerRepository implements ConsumerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: TxClient): TxClient | PrismaService {
    return tx ?? this.prisma;
  }

  async create(data: CreateConsumerData, tx?: TxClient): Promise<Consumer> {
    const row = await this.client(tx).consumer.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        name: data.name,
        phone: data.phone,
        cpf: data.cpf ?? null,
      },
    });
    return row as Consumer;
  }

  async findByUserId(userId: string, tx?: TxClient): Promise<Consumer | null> {
    const row = await this.client(tx).consumer.findFirst({
      where: { userId, deletedAt: null },
    });
    return row as Consumer | null;
  }

  async findById(id: string, tx?: TxClient): Promise<Consumer | null> {
    const row = await this.client(tx).consumer.findFirst({
      where: { id, deletedAt: null },
    });
    return row as Consumer | null;
  }

  async update(
    id: string,
    data: UpdateConsumerData,
    tx?: TxClient,
  ): Promise<Consumer> {
    const row = await this.client(tx).consumer.update({
      where: { id },
      data,
    });
    return row as Consumer;
  }

  async softDelete(id: string, tx?: TxClient): Promise<void> {
    await this.client(tx).consumer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
