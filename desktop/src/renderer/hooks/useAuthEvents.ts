/**
 * useAuthEvents Hook
 * Subscribes to IPC push events from main process and syncs auth store.
 *
 * Must be mounted once at app root (App.tsx).
 * Handles: auth:session-expired, auth:logged-out, auth:token-refreshed
 */

import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';

export function useAuthEvents(): void {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setExpiredOffline = useAuthStore((s) => s.setExpiredOffline);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const cleanupExpired = window.electronAPI.auth.onSessionExpired(() => {
      addToast({ type: 'warning', message: 'Sesi Anda telah berakhir. Silakan login kembali.', duration: 5000 });
      clearAuth();
    });

    const cleanupLoggedOut = window.electronAPI.auth.onLoggedOut(() => {
      clearAuth();
    });

    const cleanupRefreshed = window.electronAPI.auth.onTokenRefreshed(() => {
      setExpiredOffline(false);
    });

    const cleanupOfflineExpired = window.electronAPI.auth.onOfflineExpired(() => {
      addToast({ type: 'warning', message: 'Sesi berakhir saat offline. Login kembali saat koneksi tersedia.', duration: 6000 });
      setExpiredOffline(true);
    });

    return () => {
      cleanupExpired();
      cleanupLoggedOut();
      cleanupRefreshed();
      cleanupOfflineExpired();
    };
  }, [clearAuth, setExpiredOffline]);
}
