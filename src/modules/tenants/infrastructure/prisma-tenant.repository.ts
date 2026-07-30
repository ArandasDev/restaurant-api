import { Injectable } from '@nestjs/common';
import { PrismaService, TxClient } from '../../../database/prisma.service';
import { Tenant } from '../domain/tenant.entity';
import {
  CreateTenantData,
  TenantRepository,
} from '../domain/tenant.repository';

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { slug } });
    return count > 0;
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
    }) as Promise<Tenant | null>;
  }

  async create(data: CreateTenantData, tx?: TxClient): Promise<Tenant> {
    const client = tx ?? this.prisma;
    const row = await client.tenant.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        hasMobileApp: data.hasMobileApp ?? false,
      },
    });
    return row as Tenant;
  }
}
