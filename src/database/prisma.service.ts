import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/** Prisma transaction client (the subset available inside an interactive tx). */
export type TxClient = Prisma.TransactionClient;

/**
 * Prisma wrapper that enforces multi-tenant Row-Level Security.
 *
 * Every tenant-scoped operation must run through {@link withTenant}, which opens a
 * short transaction, pins the tenant on the connection via `set_config(..., local)`,
 * and runs the work on that same connection so RLS policies apply. Operations that
 * legitimately span tenants (tenant/slug resolution, onboarding, token lookup by
 * value) use the base client directly and filter explicitly.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Runs `fn` with the given tenant pinned on the DB session so RLS policies scope
   * every query to that tenant. `set_config(..., is_local => true)` keeps the setting
   * bound to this transaction only, which is safe under connection pooling.
   */
  withTenant<T>(
    tenantId: string,
    fn: (tx: TxClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
