import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('persists an audit event', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const service = new AuditService({ auditLog: { create } } as never);
    await service.record({
      action: 'auth.login.succeeded',
      resource: 'user',
      tenantId: 't1',
      actorUserId: 'u1',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'auth.login.succeeded' }),
      }),
    );
  });

  it('never throws when persistence fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const service = new AuditService({ auditLog: { create } } as never);
    await expect(
      service.record({ action: 'x', resource: 'y' }),
    ).resolves.toBeUndefined();
  });
});
