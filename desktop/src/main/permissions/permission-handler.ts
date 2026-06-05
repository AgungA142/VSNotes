/**
 * Permission Handler
 * Mengelola izin screen recording dan microphone untuk macOS dan Windows
 */

import { systemPreferences, dialog, ipcMain, shell, BrowserWindow } from 'electron';
import { storeHelpers } from '@main/config/store';
import { PERMISSION_REQUEST, PERMISSIONS_CHANGED } from '@shared/events/ipc-events';
import type { PermissionType, PermissionStatus } from '@shared/types';

// ============================================================================
// Tipe internal
// ============================================================================

interface PermissionsChangedPayload {
  screen: PermissionStatus;
  audio: PermissionStatus;
}

// ============================================================================
// Pemeriksaan status izin
// ============================================================================

function checkScreenPermission(): PermissionStatus {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen');
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'not-determined';
  }
  // Windows: screen capture diizinkan secara default
  return 'granted';
}

function checkAudioPermission(): PermissionStatus {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'not-determined';
  }
  return 'not-determined';
}

export function checkPermission(type: 'screen' | 'audio'): PermissionStatus {
  return type === 'screen' ? checkScreenPermission() : checkAudioPermission();
}

// ============================================================================
// Permintaan izin
// ============================================================================

async function requestScreenPermission(): Promise<PermissionStatus> {
  if (process.platform === 'darwin') {
    const current = systemPreferences.getMediaAccessStatus('screen');

    if (current === 'granted') return 'granted';

    if (current === 'denied') {
      await showPermissionDeniedDialog('screen');
      return 'denied';
    }

    // Picu dialog screen recording macOS dengan mencoba capture
    await showPermissionDeniedDialog('screen');
    return systemPreferences.getMediaAccessStatus('screen') as PermissionStatus;
  }

  // Windows: selalu dianggap granted
  return 'granted';
}

async function requestAudioPermission(): Promise<PermissionStatus> {
  if (process.platform === 'darwin') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    return granted ? 'granted' : 'denied';
  }

  if (process.platform === 'win32') {
    const current = systemPreferences.getMediaAccessStatus('microphone');
    if (current === 'granted') return 'granted';

    // Windows: arahkan user ke Settings
    await showPermissionDeniedDialog('audio');
    return systemPreferences.getMediaAccessStatus('microphone') as PermissionStatus;
  }

  return 'not-determined';
}

export async function requestPermission(type: 'screen' | 'audio'): Promise<PermissionStatus> {
  const status =
    type === 'screen'
      ? await requestScreenPermission()
      : await requestAudioPermission();

  storeHelpers.setPermission(type, status);
  return status;
}

// ============================================================================
// Dialog panduan jika izin ditolak
// ============================================================================

async function showPermissionDeniedDialog(type: 'screen' | 'audio'): Promise<void> {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const labels: Record<'screen' | 'audio', { name: string; setting: string; url: string }> = {
    screen: {
      name: 'Screen Recording',
      setting: isMac
        ? 'System Settings > Privacy & Security > Screen Recording'
        : 'Settings > Privacy & Security > Screen capture',
      url: isMac ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture' : '',
    },
    audio: {
      name: 'Microphone',
      setting: isMac
        ? 'System Settings > Privacy & Security > Microphone'
        : 'Settings > Privacy > Microphone',
      url: isMac
        ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
        : 'ms-settings:privacy-microphone',
    },
  };

  const info = labels[type];

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: `Izin ${info.name} Diperlukan`,
    message: `Aplikasi membutuhkan izin ${info.name} untuk berfungsi.`,
    detail: `Buka pengaturan sistem dan aktifkan izin untuk aplikasi ini:\n\n${info.setting}\n\nSetelah mengaktifkan izin, restart aplikasi.`,
    buttons: ['Buka Pengaturan', 'Nanti'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0 && (isMac || isWindows) && info.url) {
    await shell.openExternal(info.url);
  }
}

// ============================================================================
// Emit status ke renderer
// ============================================================================

function emitPermissionsChanged(mainWindow: BrowserWindow | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const payload: PermissionsChangedPayload = {
    screen: (storeHelpers.getPermission('screen') ?? 'not-determined') as PermissionStatus,
    audio: (storeHelpers.getPermission('audio') ?? 'not-determined') as PermissionStatus,
  };

  mainWindow.webContents.send(PERMISSIONS_CHANGED, payload);
}

// ============================================================================
// Inisialisasi: cek semua izin saat app start
// ============================================================================

export async function initializePermissions(mainWindow: BrowserWindow | null): Promise<void> {
  const screenStatus = checkPermission('screen');
  const audioStatus = checkPermission('audio');

  const prevScreen = storeHelpers.getPermission('screen');
  const prevAudio = storeHelpers.getPermission('audio');

  if (prevScreen !== screenStatus) storeHelpers.setPermission('screen', screenStatus);
  if (prevAudio !== audioStatus) storeHelpers.setPermission('audio', audioStatus);

  emitPermissionsChanged(mainWindow);

  // Minta izin yang belum ditentukan
  if (screenStatus === 'not-determined') {
    const newStatus = await requestPermission('screen');
    if (newStatus !== screenStatus) emitPermissionsChanged(mainWindow);
  }

  if (audioStatus === 'not-determined') {
    const newStatus = await requestPermission('audio');
    if (newStatus !== audioStatus) emitPermissionsChanged(mainWindow);
  }
}

// ============================================================================
// IPC Handler
// ============================================================================

export function registerPermissionHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle(PERMISSION_REQUEST, async (_event, type: 'screen' | 'audio') => {
    const status = await requestPermission(type);
    emitPermissionsChanged(mainWindow);
    return { type, status };
  });
}
