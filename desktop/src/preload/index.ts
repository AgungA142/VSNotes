/**
 * Electron Preload Script
 * Security boundary between main and renderer processes.
 * Exposes a minimal, typed API via contextBridge — no Node.js APIs leak through.
 */

import { contextBridge, ipcRenderer } from 'electron';
import * as IPC from '@shared/events/ipc-events';
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

// ============================================================================
// Channel whitelists — only these channels may cross the security boundary
// ============================================================================

const ALLOWED_COMMANDS = new Set<string>([
  IPC.SESSION_START,
  IPC.SESSION_PAUSE,
  IPC.SESSION_RESUME,
  IPC.SESSION_END,
  IPC.SESSION_DISMISS,
  IPC.SCREEN_MONITOR_START,
  IPC.SCREEN_MONITOR_STOP,
  IPC.AUDIO_CAPTURE_START,
  IPC.AUDIO_CAPTURE_STOP,
  IPC.NOTE_CREATE,
  IPC.NOTE_UPDATE,
  IPC.NOTE_DELETE,
  IPC.SYNC_START,
  IPC.SETTINGS_PLATFORMS_UPDATE,
  IPC.SESSION_DELETE_CACHE,
]);

const ALLOWED_EVENTS = new Set<string>([
  IPC.SESSION_STATE_CHANGED,
  IPC.VIDEO_DETECTED,
  IPC.VIDEO_STOPPED,
  IPC.AUDIO_CHUNK_READY,
  IPC.AUDIO_CHUNK_UPLOADED,
  IPC.SYNC_COMPLETE,
  IPC.SYNC_ERROR,
  IPC.SYNC_STATUS_CHANGED,
  IPC.PERMISSION_GRANTED,
  IPC.PERMISSION_DENIED,
  IPC.PERMISSIONS_CHANGED,
  IPC.NOTE_SHORTCUT_TRIGGERED,
  IPC.AUTH_SESSION_EXPIRED,
  IPC.AUTH_TOKEN_REFRESHED,
  IPC.AUTH_LOGGED_OUT,
  IPC.AUTH_OFFLINE_EXPIRED,
  IPC.APP_READY,
  IPC.SETTINGS_PLATFORMS_UPDATED,
]);

// ============================================================================
// Helpers
// ============================================================================

type CleanupFn = () => void;

function assertCommand(channel: string): void {
  if (!ALLOWED_COMMANDS.has(channel)) {
    throw new Error(`IPC command channel not allowed: ${channel}`);
  }
}

function assertEvent(channel: string): void {
  if (!ALLOWED_EVENTS.has(channel)) {
    throw new Error(`IPC event channel not allowed: ${channel}`);
  }
}

// ============================================================================
// Expose typed API to renderer
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', {
  // --------------------------------------------------------------------------
  // Generic, whitelist-validated IPC primitives
  // (used when the structured API below isn't specific enough)
  // --------------------------------------------------------------------------
  ipc: {
    sendCommand(channel: string, data?: unknown): void {
      assertCommand(channel);
      ipcRenderer.send(channel, data);
    },

    onEvent(channel: string, callback: (...args: unknown[]) => void): CleanupFn {
      assertEvent(channel);
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },

    removeListener(channel: string, cleanup: CleanupFn): void {
      // Consumers may either call the CleanupFn returned from onEvent directly,
      // or pass it here for symmetry. Both paths are equivalent.
      assertEvent(channel);
      cleanup();
    },
  },

  // --------------------------------------------------------------------------
  // Session — structured API
  // --------------------------------------------------------------------------
  session: {
    start: (): void => ipcRenderer.send(IPC.SESSION_START),
    dismiss: (): void => ipcRenderer.send(IPC.SESSION_DISMISS),
    pause: (): void => ipcRenderer.send(IPC.SESSION_PAUSE),
    resume: (): void => ipcRenderer.send(IPC.SESSION_RESUME),
    end: (): void => ipcRenderer.send(IPC.SESSION_END),

    onStateChanged(callback: (state: SessionState) => void): CleanupFn {
      const handler = (_e: Electron.IpcRendererEvent, state: SessionState) =>
        callback(state);
      ipcRenderer.on(IPC.SESSION_STATE_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.SESSION_STATE_CHANGED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Screen monitor — structured API
  // --------------------------------------------------------------------------
  screenMonitor: {
    start: (): void => ipcRenderer.send(IPC.SCREEN_MONITOR_START),
    stop: (): void => ipcRenderer.send(IPC.SCREEN_MONITOR_STOP),

    onVideoDetected(callback: (info: VideoDetectionInfo) => void): CleanupFn {
      const handler = (_e: Electron.IpcRendererEvent, info: VideoDetectionInfo) =>
        callback(info);
      ipcRenderer.on(IPC.VIDEO_DETECTED, handler);
      return () => ipcRenderer.removeListener(IPC.VIDEO_DETECTED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Notes — structured API
  // --------------------------------------------------------------------------
  notes: {
    create: (data: CreateNotePayload): void => ipcRenderer.send(IPC.NOTE_CREATE, data),
    update: (id: string, data: UpdateNotePayload): void =>
      ipcRenderer.send(IPC.NOTE_UPDATE, id, data),
    delete: (id: string): void => ipcRenderer.send(IPC.NOTE_DELETE, id),

    onShortcut(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.NOTE_SHORTCUT_TRIGGERED, handler);
      return () => ipcRenderer.removeListener(IPC.NOTE_SHORTCUT_TRIGGERED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Sync — structured API
  // --------------------------------------------------------------------------
  sync: {
    start: (): void => ipcRenderer.send(IPC.SYNC_START),

    onComplete(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.SYNC_COMPLETE, handler);
      return () => ipcRenderer.removeListener(IPC.SYNC_COMPLETE, handler);
    },

    onError(callback: (error: Error) => void): CleanupFn {
      const handler = (_e: Electron.IpcRendererEvent, error: Error) => callback(error);
      ipcRenderer.on(IPC.SYNC_ERROR, handler);
      return () => ipcRenderer.removeListener(IPC.SYNC_ERROR, handler);
    },

    onStatusChanged(
      callback: (status: { pendingCount: number; isSyncing: boolean; isOnline: boolean; lastSyncAt: string | null }) => void
    ): CleanupFn {
      const handler = (_e: Electron.IpcRendererEvent, status: Parameters<typeof callback>[0]) =>
        callback(status);
      ipcRenderer.on(IPC.SYNC_STATUS_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.SYNC_STATUS_CHANGED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Auth — structured API
  // --------------------------------------------------------------------------
  auth: {
    login: (email: string, password: string): Promise<AuthResult> =>
      ipcRenderer.invoke(IPC.AUTH_LOGIN, { email, password }),

    register: (email: string, password: string, name: string): Promise<AuthResult> =>
      ipcRenderer.invoke(IPC.AUTH_REGISTER, { email, password, name }),

    logout: (): Promise<void> =>
      ipcRenderer.invoke(IPC.AUTH_LOGOUT),

    check: (): Promise<{ isAuthenticated: boolean; user: User | null; token: string | null }> =>
      ipcRenderer.invoke(IPC.AUTH_CHECK),

    forgotPassword: (email: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.AUTH_FORGOT_PASSWORD, { email }),

    onSessionExpired(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.AUTH_SESSION_EXPIRED, handler);
      return () => ipcRenderer.removeListener(IPC.AUTH_SESSION_EXPIRED, handler);
    },

    onTokenRefreshed(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.AUTH_TOKEN_REFRESHED, handler);
      return () => ipcRenderer.removeListener(IPC.AUTH_TOKEN_REFRESHED, handler);
    },

    onLoggedOut(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.AUTH_LOGGED_OUT, handler);
      return () => ipcRenderer.removeListener(IPC.AUTH_LOGGED_OUT, handler);
    },

    onOfflineExpired(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.AUTH_OFFLINE_EXPIRED, handler);
      return () => ipcRenderer.removeListener(IPC.AUTH_OFFLINE_EXPIRED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Clipboard — write via Electron clipboard API
  // --------------------------------------------------------------------------
  clipboard: {
    write: (text: string): Promise<void> => ipcRenderer.invoke(IPC.CLIPBOARD_WRITE, text),
  },

  // --------------------------------------------------------------------------
  // Export — save file via Electron save dialog
  // --------------------------------------------------------------------------
  export: {
    save: (payload: { content: string | Uint8Array; filename: string; mimeType: string }): Promise<{ success: boolean; filePath?: string }> =>
      ipcRenderer.invoke(IPC.EXPORT_SAVE, payload),
  },

  // --------------------------------------------------------------------------
  // Settings — platform management
  // --------------------------------------------------------------------------
  settings: {
    updatePlatforms: (platforms: string[]): void =>
      ipcRenderer.send(IPC.SETTINGS_PLATFORMS_UPDATE, platforms),

    onPlatformsUpdated(callback: (platforms: string[]) => void): CleanupFn {
      const handler = (_e: Electron.IpcRendererEvent, platforms: string[]) =>
        callback(platforms);
      ipcRenderer.on(IPC.SETTINGS_PLATFORMS_UPDATED, handler);
      return () => ipcRenderer.removeListener(IPC.SETTINGS_PLATFORMS_UPDATED, handler);
    },
  },

  // --------------------------------------------------------------------------
  // App lifecycle — structured API
  // --------------------------------------------------------------------------
  app: {
    onReady(callback: () => void): CleanupFn {
      const handler = () => callback();
      ipcRenderer.on(IPC.APP_READY, handler);
      return () => ipcRenderer.removeListener(IPC.APP_READY, handler);
    },
  },

  // --------------------------------------------------------------------------
  // Permissions — structured API
  // --------------------------------------------------------------------------
  permissions: {
    request: (type: PermissionType): Promise<PermissionResponse> =>
      ipcRenderer.invoke(IPC.PERMISSION_REQUEST, type),

    onChanged(
      callback: (permissions: { screen: string; audio: string }) => void
    ): CleanupFn {
      const handler = (
        _e: Electron.IpcRendererEvent,
        payload: { screen: string; audio: string }
      ) => callback(payload);
      ipcRenderer.on(IPC.PERMISSIONS_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.PERMISSIONS_CHANGED, handler);
    },
  },
});
