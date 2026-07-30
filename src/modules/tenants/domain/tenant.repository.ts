import { TxClient } from '../../../database/prisma.service';
import { Tenant, TenantPlan } from './tenant.entity';

export interface CreateTenantData {
  id: string;
  name: string;
  slug: string;
  plan?: TenantPlan;
  hasMobileApp?: boolean;
}

export interface TenantRepository {
  existsBySlug(slug: string): Promise<boolean>;
  findBySlug(slug: string): Promise<Tenant | null>;
  create(data: CreateTenantData, tx?: TxClient): Promise<Tenant>;
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
