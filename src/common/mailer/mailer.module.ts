import { Global, Module } from '@nestjs/common';
import { LogMailerAdapter } from './log-mailer.adapter';
import { MAILER } from './mailer.port';

@Global()
@Module({
  providers: [{ provide: MAILER, useClass: LogMailerAdapter }],
  exports: [MAILER],
})
export class MailerModule {}
