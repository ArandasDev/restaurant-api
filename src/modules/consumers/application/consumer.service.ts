import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { PasswordHasherService } from '../../../common/crypto/password-hasher.service';
import { Role } from '../../../common/enums/role.enum';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { TenantContextService } from '../../../tenancy/tenant-context.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../users/domain/user.repository';
import { Consumer } from '../domain/consumer.entity';
import {
  CONSUMER_REPOSITORY,
  ConsumerRepository,
} from '../domain/consumer.repository';

export interface RegisterConsumerCommand {
  email: string;
  password: string;
  name: string;
  phone: string;
  cpf?: string;
}

export interface UpdateConsumerCommand {
  name?: string;
  phone?: string;
  cpf?: string | null;
}

@Injectable()
export class ConsumerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly hasher: PasswordHasherService,
    private readonly audit: AuditService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CONSUMER_REPOSITORY) private readonly consumers: ConsumerRepository,
  ) {}

  async register(command: RegisterConsumerCommand): Promise<Consumer> {
    const tenantId = this.requireTenant();
    const passwordHash = await this.hasher.hash(command.password);

    const consumer = await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await this.users.findByEmailInTenant(
        tenantId,
        command.email,
        tx,
      );
      if (existing) {
        throw new ConflictError(
          'CONSUMER_EMAIL_TAKEN',
          'An account with this email already exists',
        );
      }
      const user = await this.users.create(
        {
          tenantId,
          email: command.email,
          passwordHash,
          role: Role.CONSUMER,
        },
        tx,
      );
      return this.consumers.create(
        {
          tenantId,
          userId: user.id,
          name: command.name,
          phone: command.phone,
          cpf: command.cpf ?? null,
        },
        tx,
      );
    });

    await this.audit.record({
      action: 'consumer.registered',
      resource: 'consumer',
      tenantId,
      actorUserId: consumer.userId,
    });
    return consumer;
  }

  getProfile(userId: string): Promise<Consumer> {
    const tenantId = this.requireTenant();
    return this.prisma.withTenant(tenantId, async (tx) =>
      this.requireConsumer(userId, tx),
    );
  }

  async updateProfile(
    userId: string,
    command: UpdateConsumerCommand,
  ): Promise<Consumer> {
    const tenantId = this.requireTenant();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const consumer = await this.requireConsumer(userId, tx);
      return this.consumers.update(consumer.id, command, tx);
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    const tenantId = this.requireTenant();
    await this.prisma.withTenant(tenantId, async (tx) => {
      const consumer = await this.requireConsumer(userId, tx);
      await this.consumers.softDelete(consumer.id, tx);
      await this.users.softDelete(userId, tx);
    });
    await this.audit.record({
      action: 'consumer.deleted',
      resource: 'consumer',
      tenantId,
      actorUserId: userId,
    });
  }

  private async requireConsumer(
    userId: string,
    tx: TxClient,
  ): Promise<Consumer> {
    const consumer = await this.consumers.findByUserId(userId, tx);
    if (!consumer) {
      throw new NotFoundError(
        'CONSUMER_NOT_FOUND',
        'Consumer profile not found',
      );
    }
    return consumer;
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
