/**
 * System Tray Manager
 * Mengelola ikon tray dan menu konteks aplikasi
 */

import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

// State sesi sederhana untuk label Pause/Resume di tray
// Akan disinkronkan dengan XState saat task 11.1 diimplementasi
let isSessionActive = false;
let isSessionPaused = false;

// ============================================================================
// Pembuatan ikon tray
// ============================================================================

function loadTrayIcon(): Electron.NativeImage {
  const iconPath = path.join(app.getAppPath(), 'resources', 'icons', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  // Fallback: ikon kosong jika file tidak ditemukan
  if (icon.isEmpty()) {
    // Minimal 1x1 transparent PNG sebagai placeholder saat pengembangan
    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWjR/WRAAAAAASUVORK5CYII='
    );
  }

  // macOS: gunakan template image agar adaptif dengan mode gelap/terang
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  return icon;
}

// ============================================================================
// Pembangunan context menu
// ============================================================================

function buildContextMenu(mainWindow: BrowserWindow): Electron.Menu {
  const pauseResumeLabel = isSessionPaused
    ? 'Resume Sesi'
    : isSessionActive
      ? 'Pause Sesi'
      : 'Tidak Ada Sesi Aktif';

  return Menu.buildFromTemplate([
    {
      label: 'Buka Video Summary Notes',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: pauseResumeLabel,
      enabled: isSessionActive,
      click: () => {
        if (isSessionPaused) {
          mainWindow.webContents.send('session:resume');
        } else {
          mainWindow.webContents.send('session:pause');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Keluar',
      click: () => {
        app.quit();
      },
    },
  ]);
}

// ============================================================================
// Update state sesi (dipanggil dari main saat XState berubah)
// ============================================================================

export function updateTraySessionState(active: boolean, paused: boolean): void {
  isSessionActive = active;
  isSessionPaused = paused;
}

// ============================================================================
// Refresh context menu (setelah state berubah)
// ============================================================================

export function refreshTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;
  tray.setContextMenu(buildContextMenu(mainWindow));
}

// ============================================================================
// Inisialisasi tray
// ============================================================================

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = loadTrayIcon();
  tray = new Tray(icon);

  tray.setToolTip('Video Summary & Auto-Notes');
  tray.setContextMenu(buildContextMenu(mainWindow));

  // Klik kiri: tampilkan / sembunyikan jendela utama
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Double klik: selalu tampilkan dan fokus
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Sembunyikan ke tray saat window ditutup (bukan quit)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return tray;
}

// ============================================================================
// Destruksi tray
// ============================================================================

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
