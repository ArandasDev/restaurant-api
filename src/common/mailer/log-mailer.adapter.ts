import { Injectable, Logger } from '@nestjs/common';
import { MailerPort, PasswordResetEmail } from './mailer.port';

/**
 * Development/stub mailer: logs the message instead of sending. Swapping in a real
 * SMTP/SES adapter is a one-line provider change in MailerModule — no use-case edits.
 * The reset token is only logged outside production to aid local testing.
 */
@Injectable()
export class LogMailerAdapter implements MailerPort {
  private readonly logger = new Logger('Mailer');

  async sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger.log({
      type: 'password_reset',
      to: email.to,
      tenantId: email.tenantId,
      ...(isProd ? {} : { resetToken: email.resetToken }),
    });
  }
}
