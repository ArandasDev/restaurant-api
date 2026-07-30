import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CreateTenantUseCase } from './application/create-tenant.use-case';
import { TENANT_REPOSITORY } from './domain/tenant.repository';
import { PrismaTenantRepository } from './infrastructure/prisma-tenant.repository';
import { TenantsController } from './presentation/tenants.controller';

@Module({
  imports: [UsersModule],
  controllers: [TenantsController],
  providers: [
    CreateTenantUseCase,
    { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
  ],
  exports: [TENANT_REPOSITORY],
})
export class TenantsModule {}
