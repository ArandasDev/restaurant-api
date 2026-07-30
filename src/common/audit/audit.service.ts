import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEvent {
  action: string;
  resource: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Append-only security/audit trail. Persists sensitive actions (login, password
 * reset, account deletion) and mirrors them to structured logs. Failures to write
 * the trail must never break the primary operation, so errors are swallowed + logged.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    this.logger.log({
      action: event.action,
      resource: event.resource,
      tenantId: event.tenantId ?? null,
      actorUserId: event.actorUserId ?? null,
    });
    try {
      await this.prisma.auditLog.create({
        data: {
          action: event.action,
          resource: event.resource,
          tenantId: event.tenantId ?? null,
          actorUserId: event.actorUserId ?? null,
          metadata: (event.metadata ?? undefined) as never,
          ip: event.ip ?? null,
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to persist audit event');
    }
  }
}
