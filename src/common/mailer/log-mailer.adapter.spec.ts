import { LogMailerAdapter } from './log-mailer.adapter';

describe('LogMailerAdapter', () => {
  const adapter = new LogMailerAdapter();

  it('resolves without throwing (dev transport)', async () => {
    await expect(
      adapter.sendPasswordReset({
        to: 'maria@example.com',
        tenantId: 't1',
        resetToken: 'tok.secret',
      }),
    ).resolves.toBeUndefined();
  });

  it('does not log the reset token in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const spy = jest
      .spyOn(
        (adapter as unknown as { logger: { log: (v: unknown) => void } })
          .logger,
        'log',
      )
      .mockImplementation(() => undefined);
    await adapter.sendPasswordReset({
      to: 'maria@example.com',
      tenantId: 't1',
      resetToken: 'tok.secret',
    });
    const logged = JSON.stringify(spy.mock.calls[0][0]);
    expect(logged).not.toContain('tok.secret');
    process.env.NODE_ENV = prev;
    spy.mockRestore();
  });
});
