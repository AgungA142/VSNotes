import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, refreshToken } from '../auth.service';

// Mock dependencies
vi.mock('@models/User', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('@utils/jwt/jwt.util', () => ({
  signToken: vi.fn(),
}));

vi.mock('@config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
  },
}));

import { User } from '@models/User';
import bcrypt from 'bcrypt';
import { signToken } from '@utils/jwt/jwt.util';

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  passwordHash: 'hashedpassword123',
  name: 'Test User',
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // register()
  // =========================================================================

  describe('register()', () => {
    it('berhasil register user baru', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedpw' as never);
      vi.mocked(User.create).mockResolvedValue(mockUser as never);
      vi.mocked(signToken).mockReturnValue('jwt-token');

      const result = await register({
        email: 'test@example.com',
        password: 'Password1!',
        name: 'Test User',
        confirmPassword: 'Password1!',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.token).toBe('jwt-token');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password1!', 12);
    });

    it('lempar 409 jika email sudah terdaftar', async () => {
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);

      await expect(
        register({
          email: 'test@example.com',
          password: 'Password1!',
          name: 'Test User',
          confirmPassword: 'Password1!',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
      });

      expect(User.create).not.toHaveBeenCalled();
    });

    it('hash password sebelum disimpan', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('securely-hashed' as never);
      vi.mocked(User.create).mockResolvedValue({ ...mockUser, passwordHash: 'securely-hashed' } as never);
      vi.mocked(signToken).mockReturnValue('jwt-token');

      await register({
        email: 'new@example.com',
        password: 'RawPassword1!',
        name: 'New User',
        confirmPassword: 'RawPassword1!',
      });

      const createCall = vi.mocked(User.create).mock.calls[0][0] as { passwordHash: string };
      expect(createCall.passwordHash).toBe('securely-hashed');
    });
  });

  // =========================================================================
  // login()
  // =========================================================================

  describe('login()', () => {
    it('berhasil login dengan kredensial valid', async () => {
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(signToken).mockReturnValue('jwt-token');

      const result = await login({ email: 'test@example.com', password: 'Password1!' });

      expect(result.email).toBe('test@example.com');
      expect(result.token).toBe('jwt-token');
    });

    it('lempar 401 jika email tidak ditemukan', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);

      await expect(
        login({ email: 'notfound@example.com', password: 'Password1!' })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('lempar 401 jika password salah', async () => {
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        login({ email: 'test@example.com', password: 'WrongPassword1!' })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('pesan error login tidak membedakan email vs password (security)', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);
      const errorEmailNotFound = await login({ email: 'x@x.com', password: 'P' }).catch((e) => e);

      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      const errorWrongPassword = await login({ email: 'test@example.com', password: 'P' }).catch((e) => e);

      expect(errorEmailNotFound.message).toBe(errorWrongPassword.message);
    });
  });

  // =========================================================================
  // refreshToken()
  // =========================================================================

  describe('refreshToken()', () => {
    it('menghasilkan token baru untuk user valid', async () => {
      vi.mocked(User.findById).mockResolvedValue(mockUser as never);
      vi.mocked(signToken).mockReturnValue('new-jwt-token');

      const result = await refreshToken('507f1f77bcf86cd799439011', 'test@example.com');

      expect(result.token).toBe('new-jwt-token');
      expect(signToken).toHaveBeenCalledWith({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      });
    });

    it('lempar 401 jika userId tidak ditemukan di database', async () => {
      vi.mocked(User.findById).mockResolvedValue(null);

      await expect(
        refreshToken('nonexistent-id', 'test@example.com')
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });
  });
});
