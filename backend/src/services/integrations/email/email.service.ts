import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { env } from '@config/env';
import { logger } from '@config/logger';

// ============================================================================
// Transporter
// ============================================================================

function createTransporter() {
  if (!env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

// ============================================================================
// Template loader
// ============================================================================

function loadTemplate(templateName: string, vars: Record<string, string>): string {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

// ============================================================================
// Public API
// ============================================================================

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  userName: string
): Promise<void> {
  const resetUrl = `${env.APP_URL}/v1/auth/reset-password?token=${resetToken}`;
  const transporter = createTransporter();

  if (!transporter) {
    // Dev mode fallback — log link to console
    logger.info('[Email] SMTP tidak dikonfigurasi. Link reset password (development only):');
    logger.info(`[Email] Reset URL untuk ${to}: ${resetUrl}`);
    return;
  }

  const html = loadTemplate('reset-password', { userName, resetUrl });

  await transporter.sendMail({
    from: `"VSNotes" <${env.FROM_EMAIL}>`,
    to,
    subject: 'Reset Password — VSNotes',
    html,
    text: `Reset password Anda di: ${resetUrl}\n\nTautan ini berlaku 15 menit.`,
  });

  logger.info(`[Email] Reset password email sent to ${to}`);
}
