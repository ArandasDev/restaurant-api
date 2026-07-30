export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TenantPlan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

/** Domain view of a restaurant tenant. */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  hasMobileApp: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
