import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '@models/User';
import { AppError } from '@middleware/error-handler';

const BCRYPT_ROUNDS = 12;

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(
      400,
      'INVALID_OR_EXPIRED_TOKEN',
      'Tautan reset password tidak valid atau sudah kadaluarsa. Silakan minta tautan baru.'
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordChangedAt = new Date();
  user.passwordResetToken = null;
  user.passwordResetExpiry = null;
  await user.save();
}
