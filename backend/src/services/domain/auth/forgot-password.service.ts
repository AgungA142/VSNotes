import crypto from 'crypto';
import { User } from '@models/User';
import { AppError } from '@middleware/error-handler';
import { sendPasswordResetEmail } from '@services/integrations/email/email.service';
import { logger } from '@config/logger';

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 menit
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;  // 1 jam
const RATE_LIMIT_MAX = 3;

// In-memory rate limit store: email → { count, windowStart }
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(email: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(email);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(email, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    throw new AppError(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Terlalu banyak permintaan reset password. Coba lagi dalam 1 jam.'
    );
  }

  rateLimitStore.set(email, { count: entry.count + 1, windowStart: entry.windowStart });
}

export async function forgotPassword(email: string): Promise<void> {
  checkRateLimit(email);

  const user = await User.findOne({ email });
  // Tidak reveal apakah email terdaftar — selalu lanjutkan tanpa error
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  // Email delivery non-fatal — token sudah tersimpan, endpoint tetap return 200
  // agar tidak reveal apakah email terdaftar atau apakah pengiriman berhasil
  try {
    await sendPasswordResetEmail(user.email, rawToken, user.name);
  } catch (emailErr) {
    logger.error('[ForgotPassword] Gagal mengirim email reset password:', emailErr);
  }
}

// Untuk keperluan testing — reset rate limit store
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
}
