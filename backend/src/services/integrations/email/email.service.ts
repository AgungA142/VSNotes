import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { env } from '@config/env';
import { logger } from '@config/logger';

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
// SMTP sender (primary) — 2 detik timeout, langsung fallback jika gagal
// ============================================================================

async function sendViaSMTP(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 2_000,
    greetingTimeout: 2_000,
    socketTimeout: 2_000,
  });

  await transporter.sendMail({
    from: `"VSNotes" <${env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}

// ============================================================================
// Brevo HTTP API sender (fallback)
// ============================================================================

async function sendViaBrevoApi(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'VSNotes', email: env.FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
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

  if (!env.SMTP_HOST && !env.BREVO_API_KEY) {
    logger.info('[Email] Tidak ada konfigurasi email. Reset URL (dev only):');
    logger.info(`[Email] ${resetUrl}`);
    return;
  }

  const html = loadTemplate('reset-password', { userName, resetUrl });
  const text = `Reset password Anda di: ${resetUrl}\n\nTautan ini berlaku 15 menit.`;
  const subject = 'Reset Password — VSNotes';

  if (env.SMTP_HOST) {
    try {
      await sendViaSMTP(to, subject, html, text);
      logger.info(`[Email] Terkirim via SMTP ke ${to}`);
      return;
    } catch (smtpErr) {
      logger.warn('[Email] SMTP gagal, beralih ke Brevo API:', (smtpErr as Error).message);
    }
  }

  if (env.BREVO_API_KEY) {
    await sendViaBrevoApi(to, subject, html, text);
    logger.info(`[Email] Terkirim via Brevo API ke ${to}`);
    return;
  }

  throw new Error('Tidak ada metode pengiriman email yang tersedia');
}
