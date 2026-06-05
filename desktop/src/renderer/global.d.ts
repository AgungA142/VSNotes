/// <reference types="vite/client" />

/**
 * Global type declarations for renderer process
 * Defines the electronAPI exposed by the preload script
 */

import type {
  SessionState,
  VideoDetectionInfo,
  CreateNotePayload,
  UpdateNotePayload,
  PermissionType,
  PermissionResponse,
  AuthResult,
  User,
} from '@shared/types';

type CleanupFn = () => void;

declare global {
  interface Window {
    electronAPI: {
      /** Generic whitelist-validated IPC primitives */
      ipc: {
        sendCommand(channel: string, data?: unknown): void;
        onEvent(channel: string, callback: (...args: unknown[]) => void): CleanupFn;
        removeListener(channel: string, cleanup: CleanupFn): void;
      };

      session: {
        start(): void;
        dismiss(): void;
        pause(): void;
        resume(): void;
        end(): void;
        /** Returns a cleanup function to remove the listener */
        onStateChanged(callback: (state: SessionState) => void): CleanupFn;
      };

      screenMonitor: {
        start(): void;
        stop(): void;
        /** Returns a cleanup function to remove the listener */
        onVideoDetected(callback: (info: VideoDetectionInfo) => void): CleanupFn;
      };

      notes: {
        create(data: CreateNotePayload): void;
        update(id: string, data: UpdateNotePayload): void;
        delete(id: string): void;
        /** Returns a cleanup function; fires when Ctrl/Cmd+Shift+N is pressed */
        onShortcut(callback: () => void): CleanupFn;
      };

      sync: {
        start(): void;
        /** Returns a cleanup function to remove the listener */
        onComplete(callback: () => void): CleanupFn;
        /** Returns a cleanup function to remove the listener */
        onError(callback: (error: Error) => void): CleanupFn;
        /** Returns a cleanup function to remove the listener */
        onStatusChanged(callback: (status: { pendingCount: number; isSyncing: boolean; isOnline: boolean; lastSyncAt: string | null }) => void): CleanupFn;
      };

      app: {
        /** Fires once after main process completes the startup auth check */
        onReady(callback: () => void): CleanupFn;
      };

      auth: {
        login(email: string, password: string): Promise<AuthResult>;
        register(email: string, password: string, name: string): Promise<AuthResult>;
        logout(): Promise<void>;
        check(): Promise<{ isAuthenticated: boolean; user: User | null; token: string | null }>;
        forgotPassword(email: string): Promise<{ success: boolean; error?: string }>;
        onSessionExpired(callback: () => void): CleanupFn;
        onTokenRefreshed(callback: () => void): CleanupFn;
        onLoggedOut(callback: () => void): CleanupFn;
        onOfflineExpired(callback: () => void): CleanupFn;
      };

      permissions: {
        request(type: PermissionType): Promise<PermissionResponse>;
        /** Returns a cleanup function to remove the listener */
        onChanged(callback: (permissions: { screen: string; audio: string }) => void): CleanupFn;
      };

      clipboard: {
        write(text: string): Promise<void>;
      };

      export: {
        /** Buka Electron save dialog dan simpan file ekspor */
        save(payload: { content: string | Uint8Array; filename: string; mimeType: string }): Promise<{ success: boolean; filePath?: string }>;
      };

      settings: {
        /** Kirim daftar platform baru ke main process untuk update ScreenMonitor */
        updatePlatforms(platforms: string[]): void;
        /** Fires saat main process mengkonfirmasi update platform */
        onPlatformsUpdated(callback: (platforms: string[]) => void): CleanupFn;
      };
    };
  }
}

export {};
