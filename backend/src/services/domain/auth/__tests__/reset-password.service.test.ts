import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@models/User', () => ({
  User: { findOne: vi.fn() },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new-hashed-password'),
  },
}));

import { User } from '@models/User';
import bcrypt from 'bcrypt';
import { resetPassword } from '../reset-password.service';

// ============================================================================
// Helpers
// ============================================================================

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function makeUser(overrides = {}) {
  return {
    passwordHash: 'old-hash',
    passwordChangedAt: null as Date | null,
    passwordResetToken: null as string | null,
    passwordResetExpiry: null as Date | null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const RAW_TOKEN = 'a'.repeat(64);  // 64-char hex-like raw token
const HASHED_TOKEN = hashToken(RAW_TOKEN);

// ============================================================================
// Tests
// ============================================================================

describe('resetPassword()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('memperbarui passwordHash dengan bcrypt saat token valid', async () => {
    const user = makeUser({ passwordResetToken: HASHED_TOKEN, passwordResetExpiry: new Date(Date.now() + 60_000) });
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await resetPassword(RAW_TOKEN, 'NewPassword123!');

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
    expect(user.passwordHash).toBe('new-hashed-password');
  });

  it('men-set passwordChangedAt ke waktu sekarang setelah reset berhasil', async () => {
    const before = Date.now();
    const user = makeUser({ passwordResetToken: HASHED_TOKEN, passwordResetExpiry: new Date(Date.now() + 60_000) });
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await resetPassword(RAW_TOKEN, 'NewPassword123!');

    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('menghapus passwordResetToken dan passwordResetExpiry setelah reset', async () => {
    const user = makeUser({ passwordResetToken: HASHED_TOKEN, passwordResetExpiry: new Date(Date.now() + 60_000) });
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await resetPassword(RAW_TOKEN, 'NewPassword123!');

    expect(user.passwordResetToken).toBeNull();
    expect(user.passwordResetExpiry).toBeNull();
    expect(user.save).toHaveBeenCalledOnce();
  });

  it('mencari user dengan hash SHA-256 dari token, bukan raw token', async () => {
    const user = makeUser({ passwordResetToken: HASHED_TOKEN, passwordResetExpiry: new Date(Date.now() + 60_000) });
    vi.mocked(User.findOne).mockResolvedValue(user as never);

    await resetPassword(RAW_TOKEN, 'NewPassword123!');

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ passwordResetToken: HASHED_TOKEN })
    );
    // Tidak boleh mencari dengan raw token
    expect(User.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ passwordResetToken: RAW_TOKEN })
    );
  });

  // --------------------------------------------------------------------------
  // Token invalid / expired
  // --------------------------------------------------------------------------

  it('throw 400 INVALID_OR_EXPIRED_TOKEN jika token tidak cocok', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(resetPassword('wrong-token', 'NewPassword123!')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('throw 400 INVALID_OR_EXPIRED_TOKEN jika token sudah kadaluarsa', async () => {
    // User.findOne dengan filter $gt: new Date() akan return null untuk expired token
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(resetPassword(RAW_TOKEN, 'NewPassword123!')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('throw 400 jika token sudah digunakan (token sudah di-clear)', async () => {
    // Setelah reset sebelumnya, passwordResetToken = null → findOne return null
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(resetPassword(RAW_TOKEN, 'NewPassword123!')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  // --------------------------------------------------------------------------
  // Token adalah single-use
  // --------------------------------------------------------------------------

  it('tidak memanggil save jika token tidak valid', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    const saveMock = vi.fn();

    try {
      await resetPassword('bad-token', 'NewPassword123!');
    } catch {
      // expected
    }

    expect(saveMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Query MongoDB menggunakan expiry filter
  // --------------------------------------------------------------------------

  it('query MongoDB menyertakan filter passwordResetExpiry $gt now', async () => {
    const before = new Date();
    vi.mocked(User.findOne).mockResolvedValue(null);

    try {
      await resetPassword(RAW_TOKEN, 'NewPassword123!');
    } catch {
      // expected
    }

    const callArg = vi.mocked(User.findOne).mock.calls[0][0] as {
      passwordResetExpiry?: { $gt: Date };
    };
    expect(callArg.passwordResetExpiry?.$gt).toBeInstanceOf(Date);
    expect(callArg.passwordResetExpiry!.$gt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
