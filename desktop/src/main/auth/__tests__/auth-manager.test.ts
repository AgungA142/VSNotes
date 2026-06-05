import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { AuthManager } from '../auth-manager';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  net: { isOnline: vi.fn().mockReturnValue(true) },
}));

vi.mock('@vsnotes/api-client', () => ({
  createApiClient: vi.fn(),
  AxiosError: class AxiosError extends Error {
    response?: { status: number; data?: unknown };
  },
}));

vi.mock('@main/config/store', () => ({
  storeHelpers: {
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    getUserData: vi.fn().mockReturnValue(null),
    setUserData: vi.fn(),
    clearUserData: vi.fn(),
  },
}));

vi.mock('@shared/events/ipc-events', () => ({
  AUTH_OFFLINE_EXPIRED: 'auth:offline-expired',
  AUTH_SESSION_EXPIRED: 'auth:session-expired',
  AUTH_TOKEN_REFRESHED: 'auth:token-refreshed',
}));

import { net } from 'electron';
import { createApiClient } from '@vsnotes/api-client';
import { storeHelpers } from '@main/config/store';

// ============================================================================
// Helpers
// ============================================================================

function makeWindow() {
  return {
    webContents: { send: vi.fn() },
  } as unknown as BrowserWindow;
}

function makeJwt(expOffsetSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + expOffsetSec;
  const payload = Buffer.from(JSON.stringify({ userId: 'u1', email: 'a@b.com', exp })).toString('base64');
  return `header.${payload}.sig`;
}

const VALID_TOKEN = makeJwt(3600);   // valid 1 jam ke depan
const EXPIRED_TOKEN = makeJwt(-60);  // expired 1 menit lalu
const mockUser = { id: 'u1', email: 'a@b.com', name: 'Test' };

function mockApiClient(overrides: Partial<Record<string, () => unknown>> = {}) {
  const client = {
    login: vi.fn().mockResolvedValue({ token: VALID_TOKEN, user: mockUser }),
    register: vi.fn().mockResolvedValue({ token: VALID_TOKEN, user: mockUser }),
    refreshToken: vi.fn().mockResolvedValue({ token: VALID_TOKEN }),
    ...overrides,
  };
  vi.mocked(createApiClient).mockReturnValue(client as never);
  return client;
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthManager', () => {
  let manager: AuthManager;
  let window: ReturnType<typeof makeWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storeHelpers.getAuthToken).mockReturnValue(undefined);
    vi.mocked(storeHelpers.getUserData).mockReturnValue(null);
    vi.mocked(net.isOnline).mockReturnValue(true);
    window = makeWindow();
    manager = new AuthManager(window);
  });

  // =========================================================================
  // login()
  // =========================================================================

  describe('login()', () => {
    it('berhasil login dan menyimpan token ke store', async () => {
      mockApiClient();

      const result = await manager.login('a@b.com', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.token).toBe(VALID_TOKEN);
      expect(storeHelpers.setAuthToken).toHaveBeenCalledWith(VALID_TOKEN);
      expect(storeHelpers.setUserData).toHaveBeenCalledWith(mockUser);
    });

    it('mengembalikan error jika API gagal', async () => {
      const err = Object.assign(new Error(), {
        response: { status: 401, data: { error: { message: 'Email atau password salah' } } },
      });
      mockApiClient({ login: vi.fn().mockRejectedValue(err) });

      const result = await manager.login('a@b.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email atau password salah');
      expect(storeHelpers.setAuthToken).not.toHaveBeenCalled();
    });

    it('mengembalikan fallback error message jika response tidak ada message', async () => {
      mockApiClient({ login: vi.fn().mockRejectedValue(new Error('Network Error')) });

      const result = await manager.login('a@b.com', 'pw');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });
  });

  // =========================================================================
  // register()
  // =========================================================================

  describe('register()', () => {
    it('berhasil register dan menyimpan token', async () => {
      mockApiClient();

      const result = await manager.register('new@b.com', 'Password1!', 'New User');

      expect(result.success).toBe(true);
      expect(storeHelpers.setAuthToken).toHaveBeenCalledWith(VALID_TOKEN);
    });

    it('mengembalikan error jika email sudah terdaftar', async () => {
      const err = Object.assign(new Error(), {
        response: { status: 409, data: { error: { message: 'Email sudah terdaftar' } } },
      });
      mockApiClient({ register: vi.fn().mockRejectedValue(err) });

      const result = await manager.register('dup@b.com', 'pw', 'User');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email sudah terdaftar');
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================

  describe('logout()', () => {
    it('menghapus token dari store dan membersihkan cache', async () => {
      mockApiClient();
      await manager.login('a@b.com', 'pw');

      await manager.logout();

      expect(storeHelpers.clearUserData).toHaveBeenCalled();
      expect(manager.getStoredToken()).toBeNull();
      expect(manager.getCurrentUser()).toBeNull();
    });
  });

  // =========================================================================
  // refreshToken()
  // =========================================================================

  describe('refreshToken()', () => {
    it('berhasil refresh dan menyimpan token baru', async () => {
      const newToken = makeJwt(7200);
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      mockApiClient({ refreshToken: vi.fn().mockResolvedValue({ token: newToken }) });
      manager = new AuthManager(window);

      const result = await manager.refreshToken();

      expect(result).toBe(newToken);
      expect(storeHelpers.setAuthToken).toHaveBeenCalledWith(newToken);
      expect(window.webContents.send).toHaveBeenCalledWith('auth:token-refreshed');
    });

    it('mengembalikan null jika tidak ada token tersimpan', async () => {
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(undefined);
      manager = new AuthManager(window);

      expect(await manager.refreshToken()).toBeNull();
      expect(createApiClient).not.toHaveBeenCalled();
    });

    it('emit auth:session-expired dan logout jika refresh gagal 401', async () => {
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      const err = Object.assign(new Error(), { response: { status: 401 } });
      mockApiClient({ refreshToken: vi.fn().mockRejectedValue(err) });
      manager = new AuthManager(window);

      const result = await manager.refreshToken();

      expect(result).toBeNull();
      expect(storeHelpers.clearUserData).toHaveBeenCalled();
      expect(window.webContents.send).toHaveBeenCalledWith('auth:session-expired');
    });

    it('mengembalikan null jika network error (bukan 401)', async () => {
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      mockApiClient({ refreshToken: vi.fn().mockRejectedValue(new Error('Network Error')) });
      manager = new AuthManager(window);

      const result = await manager.refreshToken();

      expect(result).toBeNull();
      // Tidak logout — bisa retry nanti
      expect(storeHelpers.clearUserData).not.toHaveBeenCalled();
      expect(window.webContents.send).not.toHaveBeenCalledWith('auth:session-expired');
    });
  });

  // =========================================================================
  // Offline mode handling
  // =========================================================================

  describe('offline mode', () => {
    it('mengembalikan null tanpa network call saat offline', async () => {
      vi.mocked(net.isOnline).mockReturnValue(false);
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      mockApiClient();
      manager = new AuthManager(window);

      const result = await manager.refreshToken();

      expect(result).toBeNull();
      expect(createApiClient).not.toHaveBeenCalled();
    });

    it('emit auth:offline-expired saat offline dan token expired', async () => {
      vi.mocked(net.isOnline).mockReturnValue(false);
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(EXPIRED_TOKEN);
      manager = new AuthManager(window);

      await manager.refreshToken();

      expect(window.webContents.send).toHaveBeenCalledWith('auth:offline-expired');
    });

    it('tidak emit auth:offline-expired saat offline tapi token masih valid', async () => {
      vi.mocked(net.isOnline).mockReturnValue(false);
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      manager = new AuthManager(window);

      await manager.refreshToken();

      expect(window.webContents.send).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // isAuthenticated() & token cache
  // =========================================================================

  describe('isAuthenticated()', () => {
    it('mengembalikan true jika token valid dan belum expired', () => {
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(VALID_TOKEN);
      manager = new AuthManager(window);

      expect(manager.isAuthenticated()).toBe(true);
    });

    it('mengembalikan false jika token expired', () => {
      vi.mocked(storeHelpers.getAuthToken).mockReturnValue(EXPIRED_TOKEN);
      manager = new AuthManager(window);

      expect(manager.isAuthenticated()).toBe(false);
    });

    it('mengembalikan false jika tidak ada token', () => {
      expect(manager.isAuthenticated()).toBe(false);
    });
  });

  // =========================================================================
  // Rate limiting
  // =========================================================================

  describe('rate limiting login', () => {
    it('memblokir login setelah 5 percobaan gagal', async () => {
      mockApiClient({ login: vi.fn().mockRejectedValue(new Error('Invalid credentials')) });

      for (let i = 0; i < 5; i++) {
        await manager.login('a@b.com', 'wrong');
      }
      const result = await manager.login('a@b.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Terlalu banyak percobaan');
    });

    it('tidak memblokir setelah window 15 menit berakhir', async () => {
      vi.useFakeTimers();
      mockApiClient({ login: vi.fn().mockRejectedValue(new Error('Invalid')) });

      for (let i = 0; i < 5; i++) {
        await manager.login('a@b.com', 'wrong');
      }

      // Majukan waktu 16 menit
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Reset mock agar login berhasil
      mockApiClient();
      const result = await manager.login('a@b.com', 'Password1!');

      expect(result.success).toBe(true);
      vi.useRealTimers();
    });

    it('mereset counter setelah login berhasil', async () => {
      const loginMock = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue({ token: VALID_TOKEN, user: mockUser });
      mockApiClient({ login: loginMock });

      await manager.login('a@b.com', 'wrong');
      await manager.login('a@b.com', 'wrong');
      await manager.login('a@b.com', 'Password1!'); // berhasil

      // Setelah berhasil, counter di-reset — 5 gagal lagi baru diblokir
      mockApiClient({ login: vi.fn().mockRejectedValue(new Error('fail')) });
      for (let i = 0; i < 5; i++) {
        await manager.login('a@b.com', 'wrong');
      }
      const result = await manager.login('a@b.com', 'wrong');
      expect(result.error).toContain('Terlalu banyak percobaan');
    });
  });

  // =========================================================================
  // requestPasswordReset()
  // =========================================================================

  describe('requestPasswordReset()', () => {
    it('mengembalikan { success: true } saat API berhasil', async () => {
      const client = mockApiClient({ forgotPassword: vi.fn().mockResolvedValue(undefined) });

      const result = await manager.requestPasswordReset('budi@example.com');

      expect(client.forgotPassword).toHaveBeenCalledWith('budi@example.com');
      expect(result).toEqual({ success: true });
    });

    it('mengembalikan { success: true } meskipun email tidak terdaftar (anti-enumeration)', async () => {
      // Backend selalu return 200 — tidak ada error yang dilempar
      mockApiClient({ forgotPassword: vi.fn().mockResolvedValue(undefined) });

      const result = await manager.requestPasswordReset('tidak-ada@example.com');

      expect(result).toEqual({ success: true });
    });

    it('mengembalikan { success: false, error: RATE_LIMIT_EXCEEDED } saat backend return 429', async () => {
      const rateLimitError = Object.assign(new Error('Too Many Requests'), {
        response: { status: 429 },
      });
      mockApiClient({ forgotPassword: vi.fn().mockRejectedValue(rateLimitError) });

      const result = await manager.requestPasswordReset('budi@example.com');

      expect(result).toEqual({ success: false, error: 'RATE_LIMIT_EXCEEDED' });
    });

    it('mengembalikan { success: true } saat terjadi network error (anti-enumeration)', async () => {
      mockApiClient({ forgotPassword: vi.fn().mockRejectedValue(new Error('Network Error')) });

      const result = await manager.requestPasswordReset('budi@example.com');

      expect(result).toEqual({ success: true });
    });

    it('mengembalikan { success: true } saat terjadi error 500 dari server', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), {
        response: { status: 500 },
      });
      mockApiClient({ forgotPassword: vi.fn().mockRejectedValue(serverError) });

      const result = await manager.requestPasswordReset('budi@example.com');

      // Error selain 429 dianggap sukses untuk mencegah enumerasi
      expect(result).toEqual({ success: true });
    });
  });
});
