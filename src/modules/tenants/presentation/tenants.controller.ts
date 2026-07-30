import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ErrorResponse } from '../../../common/http/error-response';
import { CreateTenantUseCase } from '../application/create-tenant.use-case';
import {
  CreateTenantDto,
  TenantCreatedResponse,
} from './dto/create-tenant.dto';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly createTenant: CreateTenantUseCase) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Onboard a new restaurant (tenant) with its admin' })
  @ApiCreatedResponse({ type: TenantCreatedResponse })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'Slug already taken',
  })
  create(@Body() dto: CreateTenantDto): Promise<TenantCreatedResponse> {
    return this.createTenant.execute({
      name: dto.name,
      slug: dto.slug,
      adminEmail: dto.adminEmail,
      adminPassword: dto.adminPassword,
    });
  }
}
