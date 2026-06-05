import bcrypt from 'bcrypt';
import { User } from '@models/User';
import { signToken } from '@utils/jwt/jwt.util';
import { AppError } from '@middleware/error-handler';
import type { RegisterInput, LoginInput } from '@utils/validation/auth/auth.validation';
import type { RegisterResponseDto, LoginResponseDto, RefreshTokenResponseDto } from '../../../types/auth/auth.dto';

const BCRYPT_ROUNDS = 12;

export async function register(input: RegisterInput): Promise<RegisterResponseDto> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email sudah terdaftar');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  const token = signToken({ userId: String(user._id), email: user.email });

  return {
    userId: String(user._id),
    email: user.email,
    name: user.name,
    token,
  };
}

export async function refreshToken(userId: string, email: string): Promise<RefreshTokenResponseDto> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, 'INVALID_TOKEN', 'User tidak ditemukan');
  }
  const token = signToken({ userId, email });
  return { token };
}

export async function login(input: LoginInput): Promise<LoginResponseDto> {
  const user = await User.findOne({ email: input.email });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  const token = signToken({ userId: String(user._id), email: user.email });

  return {
    userId: String(user._id),
    email: user.email,
    name: user.name,
    token,
  };
}
