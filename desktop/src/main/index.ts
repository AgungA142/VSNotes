/**
 * Electron Main Process Entry Point
 * Handles app lifecycle, window management, and IPC communication
 */

import { app, BrowserWindow, globalShortcut, ipcMain, dialog, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import { createTray, destroyTray } from '@main/tray/tray-manager';
import * as IPC from '@shared/events/ipc-events';
import { initializePermissions, registerPermissionHandlers } from '@main/permissions/permission-handler';
import { ScreenMonitor } from '@main/screen-monitor/screen-monitor';
import { initializeSessionManager, SessionManager } from '@main/session/session-manager';
import { initDatabase, closeDatabase, setUserSettingCache, getUserSettingCache, deleteSessionBySessionId } from '@main/sync/database';
import { SyncManager } from '@main/sync/sync-manager';
import { AudioSessionDetector } from '@main/audio-capture/audio-session-detector';
import { AuthManager } from '@main/auth/auth-manager';
import { TokenRefreshJob } from '@main/auth/token-refresh.job';
import { FirstLaunchHandler } from '@main/auth/first-launch';

// Tandai app sedang quit agar close handler tidak intercept
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Electron {
    interface App {
      isQuitting: boolean;
    }
  }
}
app.isQuitting = false;

let mainWindow: BrowserWindow | null = null;
let syncManager: SyncManager | null = null;
let authManager: AuthManager | null = null;
let tokenRefreshJob: TokenRefreshJob | null = null;
let sessionManager: SessionManager | null = null;
let screenMonitor: ScreenMonitor | null = null;
let audioSessionDetector: AudioSessionDetector | null = null;

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

// ============================================================================
// Screen monitoring helpers
// ============================================================================

function startScreenMonitoring(): void {
  if (screenMonitor || !mainWindow || !sessionManager) return;

  // Mulai audio session detector jika belum jalan
  if (!audioSessionDetector) {
    audioSessionDetector = new AudioSessionDetector();
    audioSessionDetector.start();
  }

  screenMonitor = new ScreenMonitor(
    mainWindow,
    {
      onVideoDetected: (info) => sessionManager!.onVideoDetected(info),
      onVideoStopped: () => sessionManager!.onVideoStopped(),
      onVideoPaused: () => sessionManager!.onVideoPaused(),
      onVideoResumed: () => sessionManager!.onVideoResumed(),
      onVideoTabClosed: () => sessionManager!.onVideoTabClosed(),
    },
    audioSessionDetector
  );

  // Load cached platform list (offline fallback)
  const cachedPlatforms = getUserSettingCache('watchPlatforms');
  if (cachedPlatforms) {
    try {
      screenMonitor.setWatchPlatforms(JSON.parse(cachedPlatforms) as string[]);
    } catch {
      // ignore malformed cache
    }
  }

  sessionManager.setScreenMonitor(screenMonitor);
  screenMonitor.start();

  // Fetch user settings dari backend untuk mendapat watchPlatforms terbaru
  fetchAndApplyWatchPlatforms();
}

function stopScreenMonitoring(): void {
  screenMonitor?.stop();
  screenMonitor = null;
  audioSessionDetector?.stop();
  audioSessionDetector = null;
}

async function fetchAndApplyWatchPlatforms(): Promise<void> {
  const token = authManager?.getStoredToken();
  if (!token || !screenMonitor) return;

  try {
    const response = await fetch(`${API_BASE_URL}/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const json = (await response.json()) as { data?: { settings?: { watchPlatforms?: string[] } } };
    const platforms = json?.data?.settings?.watchPlatforms;
    if (Array.isArray(platforms) && platforms.length > 0) {
      screenMonitor.setWatchPlatforms(platforms);
      setUserSettingCache('watchPlatforms', JSON.stringify(platforms));
    }
  } catch {
    // offline or backend unavailable — cached platforms already applied
  }
}

// ============================================================================
// Buat jendela utama
// ============================================================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Tampilkan setelah siap agar tidak ada flash
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load aplikasi
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Tampilkan window saat sudah siap render (hindari flash putih)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Fallback: jika renderer gagal load, tetap tampilkan window
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[Main] Renderer failed to load:', code, desc);
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// App lifecycle
// ============================================================================

app.whenReady().then(async () => {
  // Inisialisasi SQLite cache sebelum window dibuat
  const dbPath = path.join(app.getPath('userData'), 'cache.db');
  try {
    initDatabase(dbPath);
  } catch (err) {
    console.error('[Main] initDatabase failed:', err);
  }

  createWindow();

  if (!mainWindow) return;

  // Inisialisasi auth manager dan token refresh job
  authManager = new AuthManager(mainWindow);
  tokenRefreshJob = new TokenRefreshJob(authManager);
  tokenRefreshJob.start();

  ipcMain.handle(IPC.AUTH_LOGIN, async (_event, { email, password }: { email: string; password: string }) => {
    const result = await authManager!.login(email, password);
    if (result.success) {
      try { startScreenMonitoring(); } catch (err) {
        console.error('[Main] startScreenMonitoring after login failed:', err);
      }
    }
    return result;
  });

  ipcMain.handle(IPC.AUTH_REGISTER, async (_event, { email, password, name }: { email: string; password: string; name: string }) => {
    const result = await authManager!.register(email, password, name);
    if (result.success) {
      try { startScreenMonitoring(); } catch (err) {
        console.error('[Main] startScreenMonitoring after register failed:', err);
      }
    }
    return result;
  });

  ipcMain.handle(IPC.AUTH_FORGOT_PASSWORD, async (_event, { email }: { email: string }) => {
    return authManager!.requestPasswordReset(email);
  });

  ipcMain.handle(IPC.AUTH_LOGOUT, async () => {
    await authManager!.logout();
    stopScreenMonitoring();
    mainWindow?.webContents.send(IPC.AUTH_LOGGED_OUT);
  });

  // Salin teks ke clipboard via Electron clipboard API
  ipcMain.handle(IPC.CLIPBOARD_WRITE, (_event, text: string) => {
    clipboard.writeText(typeof text === 'string' ? text : '');
  });

  // Simpan file ekspor via Electron save dialog (text atau binary)
  ipcMain.handle(
    IPC.EXPORT_SAVE,
    async (_event, payload: { content: string | Uint8Array; filename: string; mimeType: string }) => {
      const { content, filename, mimeType } = payload;
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'md';

      const filterMap: Record<string, { name: string; extensions: string[] }> = {
        md:  { name: 'Markdown', extensions: ['md'] },
        txt: { name: 'Text', extensions: ['txt'] },
        pdf: { name: 'PDF', extensions: ['pdf'] },
      };
      const filters = [
        filterMap[ext] ?? { name: 'File', extensions: [ext] },
        { name: 'Semua File', extensions: ['*'] },
      ];

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Simpan File Ekspor',
        defaultPath: filename,
        filters,
      });

      if (canceled || !filePath) return { success: false };

      if (content instanceof Uint8Array || Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }

      void mimeType; // consumed by caller for IPC typing only
      return { success: true, filePath };
    }
  );

  // Hapus sesi dari SQLite cache setelah berhasil dihapus dari backend
  ipcMain.on(IPC.SESSION_DELETE_CACHE, (_event, sessionId: string) => {
    if (typeof sessionId === 'string') {
      deleteSessionBySessionId(sessionId);
    }
  });

  // Handler untuk update watchPlatforms dari Settings page
  ipcMain.on(IPC.SETTINGS_PLATFORMS_UPDATE, (_event, platforms: string[]) => {
    if (screenMonitor && Array.isArray(platforms)) {
      screenMonitor.setWatchPlatforms(platforms);
      setUserSettingCache('watchPlatforms', JSON.stringify(platforms));
      mainWindow?.webContents.send(IPC.SETTINGS_PLATFORMS_UPDATED, platforms);
    }
  });

  ipcMain.handle(IPC.AUTH_CHECK, () => {
    const isAuthenticated = authManager!.isAuthenticated();
    return {
      isAuthenticated,
      user: authManager!.getCurrentUser(),
      token: isAuthenticated ? (authManager!.getStoredToken() ?? null) : null,
    };
  });

  // Inisialisasi system tray
  createTray(mainWindow);

  // Daftarkan IPC handler permissions
  registerPermissionHandlers(mainWindow);

  // Periksa dan minta izin yang diperlukan
  await initializePermissions(mainWindow);

  // Inisialisasi session manager (XState machine + IPC handlers)
  sessionManager = initializeSessionManager(mainWindow);

  // Inisialisasi sync manager — refresh token saat koneksi pulih
  syncManager = new SyncManager(mainWindow, async () => {
    if (authManager && !authManager.isAuthenticated()) {
      await authManager.refreshToken();
    }
  });
  syncManager.start();

  // Periksa auth state saat startup — screen monitor hanya jalan jika sudah login
  const firstLaunchHandler = new FirstLaunchHandler(authManager, mainWindow);
  await firstLaunchHandler.run({
    onAuthenticated: () => startScreenMonitoring(),
    onUnauthenticated: () => { /* renderer akan tampilkan AuthPage */ },
  });

  // Shortcut Ctrl/Cmd+Shift+N → buka form tambah catatan di renderer
  const shortcutKey = process.platform === 'darwin' ? 'Command+Shift+N' : 'Ctrl+Shift+N';
  globalShortcut.register(shortcutKey, () => {
    mainWindow?.webContents.send(IPC.NOTE_SHORTCUT_TRIGGERED);
  });

  // Shortcut Ctrl+Shift+I → buka DevTools untuk debugging (bisa dipakai di production)
  globalShortcut.register('Ctrl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  tokenRefreshJob?.stop();
  syncManager?.stop();
  audioSessionDetector?.stop();
  destroyTray();
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
