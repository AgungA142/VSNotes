/**
 * TokenRefreshJob
 * Background job that proactively refreshes the JWT before it expires.
 * Checks every 5 minutes; triggers refresh if expiry is within 10 minutes.
 *
 * IPC events emitted (via AuthManager):
 *   auth:token-refreshed  — on successful refresh
 *   auth:session-expired  — on 401 (token revoked/invalid)
 *
 * Network errors are logged and retried on the next interval.
 */

import { AuthManager } from '@main/auth/auth-manager';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const EXPIRY_THRESHOLD_MS = 10 * 60 * 1000; // refresh when < 10 minutes left

export class TokenRefreshJob {
  private timer: NodeJS.Timeout | null = null;
  private readonly authManager: AuthManager;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.checkAndRefresh();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async checkAndRefresh(): Promise<void> {
    // Nothing to do if user is not authenticated
    if (!this.authManager.isAuthenticated()) return;

    // Skip if token still has plenty of time left
    if (!this.authManager.isTokenExpiringSoon(EXPIRY_THRESHOLD_MS)) return;

    const newToken = await this.authManager.refreshToken();
    if (!newToken) {
      // 401 is handled inside refreshToken() (logout + auth:session-expired).
      // null from a network error means we'll retry on the next interval.
      console.warn('[TokenRefreshJob] Refresh returned null — will retry on next interval');
    }
  }
}
