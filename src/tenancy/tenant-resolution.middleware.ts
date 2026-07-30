import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from './tenant-context.service';

/**
 * Resolves the active tenant for public, tenant-scoped routes (e.g. consumer signup
 * or login for a specific restaurant) from the `X-Tenant-Slug` header. For
 * authenticated routes the tenant is later taken from the JWT claim, which overrides
 * any header value — so a token for tenant A cannot be pointed at tenant B.
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = req.header('x-tenant-slug');
    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true, deletedAt: true },
      });
      if (tenant && tenant.status === 'ACTIVE' && !tenant.deletedAt) {
        this.tenantContext.set(tenant.id);
      }
    }
    next();
  }
}
