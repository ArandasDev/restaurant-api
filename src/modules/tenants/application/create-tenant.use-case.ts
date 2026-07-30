import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../../../common/audit/audit.service';
import { PasswordHasherService } from '../../../common/crypto/password-hasher.service';
import { Role } from '../../../common/enums/role.enum';
import { ConflictError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../database/prisma.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../users/domain/user.repository';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../domain/tenant.repository';

export interface CreateTenantCommand {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CreateTenantResult {
  id: string;
  slug: string;
  name: string;
  adminUserId: string;
}

/**
 * Onboards a new restaurant: atomically creates the Tenant and its first
 * TENANT_ADMIN user. The tenant id is generated up-front so the DB session can be
 * pinned to it, satisfying RLS for the admin-user insert within the same transaction.
 */
@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasherService,
    private readonly audit: AuditService,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(command: CreateTenantCommand): Promise<CreateTenantResult> {
    if (await this.tenants.existsBySlug(command.slug)) {
      throw new ConflictError(
        'TENANT_SLUG_TAKEN',
        `The slug "${command.slug}" is already in use`,
      );
    }

    const id = randomUUID();
    const passwordHash = await this.hasher.hash(command.adminPassword);

    const { adminUserId } = await this.prisma.withTenant(id, async (tx) => {
      await this.tenants.create(
        { id, name: command.name, slug: command.slug },
        tx,
      );
      const admin = await this.users.create(
        {
          tenantId: id,
          email: command.adminEmail,
          passwordHash,
          role: Role.TENANT_ADMIN,
        },
        tx,
      );
      return { adminUserId: admin.id };
    });

    await this.audit.record({
      action: 'tenant.created',
      resource: 'tenant',
      tenantId: id,
      actorUserId: adminUserId,
      metadata: { slug: command.slug },
    });

    return { id, slug: command.slug, name: command.name, adminUserId };
  }
}
