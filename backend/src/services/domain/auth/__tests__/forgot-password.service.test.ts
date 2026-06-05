import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@models/User', () => ({
  User: { findOne: vi.fn() },
}));

vi.mock('@services/integrations/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { User } from '@models/User';
import { sendPasswordResetEmail } from '@services/integrations/email/email.service';
import { forgotPassword, _resetRateLimitStore } from '../forgot-password.service';

// ============================================================================
// Helpers
// ============================================================================

function makeSaveMock() {
  return vi.fn().mockResolvedValue(undefined);
}

function makeUser(overrides = {}) {
  return {
    _id: 'user-1',
    email: 'budi@example.com',
    name: 'Budi',
    passwordResetToken: null as string | null,
    passwordResetExpiry: null as Date | null,
    save: makeSaveMock(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('forgotPassword()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Anti-enumeration
  // --------------------------------------------------------------------------

  it('tidak throw dan tidak kirim email jika email tidak terdaftar', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(forgotPassword('tidak-ada@example.com')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Token generation & storage
  // --------------------------------------------------------------------------

  it('menyimpan token SHA-256 hash ke user jika email terdaftar', async () => {
    const user = makeUser();
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await forgotPassword('budi@example.com');

    expect(user.save).toHaveBeenCalledOnce();
    expect(typeof user.passwordResetToken).toBe('string');
    // Stored value is SHA-256 hex (64 chars), bukan raw token
    expect(user.passwordResetToken).toHaveLength(64);
    // Harus berbeda dari raw token yang dikirim ke email
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'budi@example.com',
      expect.not.stringMatching(user.passwordResetToken!),
      'Budi'
    );
  });

  it('token yang dikirim ke email adalah raw hex (64 karakter), yang disimpan adalah hash-nya', async () => {
    const user = makeUser();
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await forgotPassword('budi@example.com');

    const [, rawToken] = vi.mocked(sendPasswordResetEmail).mock.calls[0];
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(user.passwordResetToken).toBe(expectedHash);
  });

  it('expiry di-set 15 menit dari sekarang', async () => {
    const now = new Date('2026-01-01T10:00:00Z').getTime();
    vi.setSystemTime(now);

    const user = makeUser();
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await forgotPassword('budi@example.com');

    const expiryMs = user.passwordResetExpiry!.getTime();
    const expectedExpiryMs = now + 15 * 60 * 1000;
    expect(expiryMs).toBe(expectedExpiryMs);
  });

  it('memanggil sendPasswordResetEmail dengan email, rawToken, dan nama user', async () => {
    const user = makeUser({ email: 'siti@example.com', name: 'Siti' });
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await forgotPassword('siti@example.com');

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'siti@example.com',
      expect.any(String),
      'Siti'
    );
  });

  // --------------------------------------------------------------------------
  // Rate limiting
  // --------------------------------------------------------------------------

  it('3 permintaan pertama berhasil (di bawah limit)', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(forgotPassword('x@example.com')).resolves.toBeUndefined();
    await expect(forgotPassword('x@example.com')).resolves.toBeUndefined();
    await expect(forgotPassword('x@example.com')).resolves.toBeUndefined();
  });

  it('permintaan ke-4 dalam 1 jam throw 429 RATE_LIMIT_EXCEEDED', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await forgotPassword('x@example.com');
    await forgotPassword('x@example.com');
    await forgotPassword('x@example.com');

    await expect(forgotPassword('x@example.com')).rejects.toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  });

  it('rate limit tidak berlaku untuk email berbeda', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    // Habiskan limit untuk email-a
    await forgotPassword('a@example.com');
    await forgotPassword('a@example.com');
    await forgotPassword('a@example.com');

    // email-b masih bisa
    await expect(forgotPassword('b@example.com')).resolves.toBeUndefined();
  });

  it('rate limit mereset setelah window 1 jam berlalu', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await forgotPassword('z@example.com');
    await forgotPassword('z@example.com');
    await forgotPassword('z@example.com');

    // Maju waktu lebih dari 1 jam
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    // Window baru — boleh lagi
    await expect(forgotPassword('z@example.com')).resolves.toBeUndefined();
  });
});
