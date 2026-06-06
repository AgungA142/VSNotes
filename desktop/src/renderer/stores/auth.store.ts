/**
 * Auth Store (Zustand)
 * Manages authentication state in the renderer.
 *
 * All auth operations go through IPC to the main process — the JWT token
 * never touches the renderer. This store only holds user identity and status.
 *
 * IPC push events (auth:session-expired, auth:logged-out) are handled by
 * the useAuthEvents hook which calls clearAuth().
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResult } from '../../shared/types';
import { setApiToken, clearApiToken } from '../lib/api-client';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  isExpiredOffline: boolean;

  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
  clearError: () => void;
  setExpiredOffline: (value: boolean) => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
  isExpiredOffline: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.electronAPI.auth.login(email, password);
          if (result.success) {
            if (result.token) setApiToken(result.token);
            set({ user: result.user ?? null, isAuthenticated: true, isLoading: false });
          } else {
            set({ error: result.error ?? 'Login gagal', isLoading: false });
          }
          return result;
        } catch {
          set({ error: 'Gagal terhubung ke aplikasi', isLoading: false });
          return { success: false, error: 'Gagal terhubung ke aplikasi' };
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.electronAPI.auth.register(email, password, name);
          if (result.success) {
            if (result.token) setApiToken(result.token);
            set({ user: result.user ?? null, isAuthenticated: true, isLoading: false });
          } else {
            set({ error: result.error ?? 'Registrasi gagal', isLoading: false });
          }
          return result;
        } catch {
          set({ error: 'Gagal terhubung ke aplikasi', isLoading: false });
          return { success: false, error: 'Gagal terhubung ke aplikasi' };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        await window.electronAPI.auth.logout();
        clearApiToken();
        // isInitialized tetap true — kita sudah tahu user tidak terautentikasi,
        // tidak perlu checkAuth() ulang yang akan membuat App spinner selamanya.
        set({ ...initialState, isInitialized: true });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        const { isAuthenticated, user, token } = await window.electronAPI.auth.check();
        if (isAuthenticated && token) setApiToken(token);
        else clearApiToken();
        set({ isAuthenticated, user, isLoading: false, isInitialized: true });
      },

      // Called by useAuthEvents when main process pushes session-expired or logged-out
      clearAuth: () => {
        clearApiToken();
        set({ ...initialState, isInitialized: true });
      },

      clearError: () => set({ error: null }),

      setExpiredOffline: (value: boolean) => set({ isExpiredOffline: value }),
    }),
    {
      name: 'auth-store',
      // Only persist the authenticated flag for quick startup check.
      // Full auth state is verified via checkAuth() on app mount.
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);
