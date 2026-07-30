import { TxClient } from '../../../database/prisma.service';
import { Consumer } from './consumer.entity';

export interface CreateConsumerData {
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  cpf?: string | null;
}

export interface UpdateConsumerData {
  name?: string;
  phone?: string;
  cpf?: string | null;
}

export interface ConsumerRepository {
  create(data: CreateConsumerData, tx?: TxClient): Promise<Consumer>;
  findByUserId(userId: string, tx?: TxClient): Promise<Consumer | null>;
  findById(id: string, tx?: TxClient): Promise<Consumer | null>;
  update(
    id: string,
    data: UpdateConsumerData,
    tx?: TxClient,
  ): Promise<Consumer>;
  softDelete(id: string, tx?: TxClient): Promise<void>;
}

export const CONSUMER_REPOSITORY = Symbol('CONSUMER_REPOSITORY');
