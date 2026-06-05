/**
 * AuthManager
 * Handles all authentication operations in the main process.
 * JWT token is stored encrypted in electron-store and never exposed to renderer.
 */

import { BrowserWindow, net } from 'electron';
import { createApiClient, AxiosError } from '@vsnotes/api-client';
import { storeHelpers } from '@main/config/store';
import * as IPC from '@shared/events/ipc-events';
import type { User, AuthResult } from '@shared/types';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour idle

function getBackendUrl(): string {
  return process.env['API_BASE_URL'] ?? 'http://localhost:3000';
}

function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export class AuthManager {
  private readonly mainWindow: BrowserWindow;

  // In-memory cache — cleared after TOKEN_CACHE_DURATION_MS of idle
  private cachedToken: string | null = null;
  private cachedUser: User | null = null;
  private tokenCacheTimer: NodeJS.Timeout | null = null;

  // Failed login rate limiting
  private failedAttempts = 0;
  private firstFailedAttemptMs = 0;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    // Warm cache from store so first call is instant
    const stored = storeHelpers.getAuthToken() ?? null;
    if (stored) {
      this.cachedToken = stored;
      this.resetCacheTimer();
    }
    const userData = storeHelpers.getUserData();
    if (userData) this.cachedUser = userData;
  }

  // ============================================================================
  // Public auth operations
  // ============================================================================

  async login(email: string, password: string): Promise<AuthResult> {
    if (this.isRateLimited()) {
      return {
        success: false,
        error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
      };
    }

    try {
      const result = await createApiClient(getBackendUrl()).login({ email, password });
      this.persistAuthData(result.token, result.user);
      this.failedAttempts = 0;
      return { success: true, token: result.token, user: result.user };
    } catch (error) {
      this.recordFailedAttempt();
      return { success: false, error: this.extractErrorMessage(error) };
    }
  }

  async register(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const result = await createApiClient(getBackendUrl()).register({
        email,
        password,
        confirmPassword: password,
        name,
      });
      this.persistAuthData(result.token, result.user);
      return { success: true, token: result.token, user: result.user };
    } catch (error) {
      return { success: false, error: this.extractErrorMessage(error) };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await createApiClient(getBackendUrl()).forgotPassword(email);
      return { success: true };
    } catch (error) {
      const axiosErr = error as AxiosError;
      if (axiosErr.response?.status === 429) {
        return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
      }
      // Error lain tetap return success untuk mencegah enumerasi akun
      return { success: true };
    }
  }

  async logout(): Promise<void> {
    storeHelpers.clearUserData();
    this.cachedToken = null;
    this.cachedUser = null;
    if (this.tokenCacheTimer) {
      clearTimeout(this.tokenCacheTimer);
      this.tokenCacheTimer = null;
    }
  }

  /**
   * Tries to refresh the JWT using the current token.
   * On 401 → clears credentials and emits auth:session-expired to renderer.
   * When offline and token expired → emits auth:offline-expired instead.
   * Returns the new token on success, null on failure.
   */
  async refreshToken(): Promise<string | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    if (!net.isOnline()) {
      const expiry = getTokenExpiry(token);
      const isExpired = expiry !== null && expiry * 1000 <= Date.now();
      if (isExpired) {
        this.mainWindow.webContents.send(IPC.AUTH_OFFLINE_EXPIRED);
      }
      return null;
    }

    try {
      const result = await createApiClient(getBackendUrl(), token).refreshToken();
      storeHelpers.setAuthToken(result.token);
      this.cachedToken = result.token;
      this.resetCacheTimer();
      this.mainWindow.webContents.send(IPC.AUTH_TOKEN_REFRESHED);
      return result.token;
    } catch (error) {
      const axiosErr = error as AxiosError;
      if (axiosErr.response?.status === 401) {
        await this.logout();
        this.mainWindow.webContents.send(IPC.AUTH_SESSION_EXPIRED);
      }
      return null;
    }
  }

  // ============================================================================
  // Token / user accessors
  // ============================================================================

  /**
   * Returns the stored token from memory cache (primary) or electron-store (fallback).
   * Reading the token resets the idle-clear timer.
   */
  getStoredToken(): string | null {
    if (this.cachedToken) {
      this.resetCacheTimer();
      return this.cachedToken;
    }
    const stored = storeHelpers.getAuthToken() ?? null;
    if (stored) {
      this.cachedToken = stored;
      this.resetCacheTimer();
    }
    return stored;
  }

  /** Local-only check — decodes JWT expiry without a network call. */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;
    const expiry = getTokenExpiry(token);
    if (expiry === null) return false;
    return expiry * 1000 > Date.now();
  }

  /** Returns true if the token will expire within the given threshold (ms). */
  isTokenExpiringSoon(thresholdMs: number): boolean {
    const token = this.getStoredToken();
    if (!token) return false;
    const expiry = getTokenExpiry(token);
    if (expiry === null) return false;
    return expiry * 1000 - Date.now() < thresholdMs;
  }

  getCurrentUser(): User | null {
    if (this.cachedUser) return this.cachedUser;
    const userData = storeHelpers.getUserData();
    if (userData) this.cachedUser = userData;
    return userData;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private persistAuthData(token: string, user: { id: string; email: string; name: string }): void {
    storeHelpers.setAuthToken(token);
    storeHelpers.setUserData(user);
    this.cachedToken = token;
    this.cachedUser = user;
    this.resetCacheTimer();
  }

  /** Resets the 1-hour idle timer that clears the in-memory token cache. */
  private resetCacheTimer(): void {
    if (this.tokenCacheTimer) clearTimeout(this.tokenCacheTimer);
    this.tokenCacheTimer = setTimeout(() => {
      this.cachedToken = null;
      this.cachedUser = null;
      this.tokenCacheTimer = null;
    }, TOKEN_CACHE_DURATION_MS);
  }

  private isRateLimited(): boolean {
    if (this.failedAttempts === 0) return false;
    if (Date.now() - this.firstFailedAttemptMs > LOGIN_RATE_LIMIT_WINDOW_MS) {
      // Window expired — reset
      this.failedAttempts = 0;
      return false;
    }
    return this.failedAttempts >= MAX_LOGIN_ATTEMPTS;
  }

  private recordFailedAttempt(): void {
    if (this.failedAttempts === 0) this.firstFailedAttemptMs = Date.now();
    this.failedAttempts++;
  }

  private extractErrorMessage(error: unknown): string {
    const axiosErr = error as AxiosError<{ error: { message: string } }>;
    return (
      axiosErr.response?.data?.error?.message ??
      (error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.')
    );
  }
}
