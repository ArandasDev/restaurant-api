import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

/**
 * Provides the request-scoped tenant context. Global so any module can inject
 * TenantContextService without re-importing.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenancyModule {}
