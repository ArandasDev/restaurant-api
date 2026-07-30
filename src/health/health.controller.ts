import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

class HealthResponse {
  status!: 'ok' | 'degraded';
  uptime!: number;
  timestamp!: string;
  database!: 'up' | 'down';
}

/** Liveness/readiness probe. Public and un-throttled-friendly. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: HealthResponse })
  async check(): Promise<HealthResponse> {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
