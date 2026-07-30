export interface PasswordResetEmail {
  to: string;
  tenantId: string | null;
  resetToken: string;
}

/**
 * Outbound email port. The application depends on this abstraction; infrastructure
 * supplies a concrete transport (SMTP/SES/...) without any change to use cases.
 */
export interface MailerPort {
  sendPasswordReset(email: PasswordResetEmail): Promise<void>;
}

export const MAILER = Symbol('MAILER');
