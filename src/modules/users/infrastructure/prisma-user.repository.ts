import { Injectable } from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { User } from '../domain/user.entity';
import { CreateUserData, UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: TxClient): TxClient | PrismaService {
    return tx ?? this.prisma;
  }

  async findByEmailInTenant(
    tenantId: string,
    email: string,
    tx?: TxClient,
  ): Promise<User | null> {
    const row = await this.client(tx).user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    return row as User | null;
  }

  async findById(id: string, tx?: TxClient): Promise<User | null> {
    const row = await this.client(tx).user.findFirst({
      where: { id, deletedAt: null },
    });
    return row as User | null;
  }

  async create(data: CreateUserData, tx?: TxClient): Promise<User> {
    const row = await this.client(tx).user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role as Role,
      },
    });
    return row as User;
  }

  async updatePassword(
    id: string,
    passwordHash: string,
    tx?: TxClient,
  ): Promise<void> {
    await this.client(tx).user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async softDelete(id: string, tx?: TxClient): Promise<void> {
    await this.client(tx).user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
