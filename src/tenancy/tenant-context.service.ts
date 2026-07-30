import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

const TENANT_ID_KEY = 'tenantId';

/**
 * Request-scoped holder for the active tenant id, backed by AsyncLocalStorage
 * (nestjs-cls). Any layer can read the current tenant without threading it through
 * every function signature, and the Prisma extension uses it to enforce isolation.
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  set(tenantId: string): void {
    this.cls.set(TENANT_ID_KEY, tenantId);
  }

  /** Returns the active tenant id or null (e.g. platform-admin / unauthenticated). */
  get(): string | null {
    return this.cls.get<string | undefined>(TENANT_ID_KEY) ?? null;
  }

  /** Returns the active tenant id, throwing if none is set (programming error). */
  getOrThrow(): string {
    const tenantId = this.get();
    if (!tenantId) {
      throw new Error('Tenant context is not set for the current request');
    }
    return tenantId;
  }
}
