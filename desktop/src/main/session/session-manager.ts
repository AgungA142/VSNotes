/**
 * Session Manager
 * Mengelola XState actor, mendaftarkan IPC handlers, dan menangani side effects
 * (notifikasi renderer, persistensi snapshot, integrasi screen monitor).
 *
 * Arsitektur:
 * - Machine: state machine murni (state + context, tidak ada side effects)
 * - SessionManager: subscriber yang menjalankan side effects berdasarkan state changes
 *
 * IPC flow (sesuai CLAUDE.md):
 * Renderer → IPC command → SessionManager → XState event → machine → state change
 * Machine state change → SessionManager subscriber → IPC push → Renderer Zustand store
 */

import { ipcMain, BrowserWindow, net } from 'electron';
import { createActor, type Actor, type SnapshotFrom } from 'xstate';
import { store } from '@main/config/store';
import { updateTraySessionState, refreshTrayMenu } from '@main/tray/tray-manager';
import { AudioCaptureManager } from '@main/audio-capture/audio-capture';
import { ScreenMonitor } from '@main/screen-monitor/screen-monitor';
import { sessionMachine } from './session.machine';
import type { SessionMachineEvent } from './session.machine';
import * as IPC from '@shared/events/ipc-events';
import type { SessionState, VideoDetectionInfo } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

type MachineState = SnapshotFrom<typeof sessionMachine>;

// Key untuk menyimpan snapshot di electron-store
const SNAPSHOT_STORE_KEY = 'sessionSnapshot';

// Status XState state → SessionStatus untuk renderer
const STATE_TO_STATUS: Record<string, SessionState['status']> = {
  idle: 'idle',
  recording: 'recording',
  paused: 'paused',
  processing: 'processing',
  syncing: 'syncing',
  done: 'completed',
};

// ============================================================================
// SessionManager class
// ============================================================================

export class SessionManager {
  private actor: Actor<typeof sessionMachine>;
  private mainWindow: BrowserWindow;
  private previousStateName: string = 'idle';
  private audioCaptureManager: AudioCaptureManager;
  private screenMonitor: ScreenMonitor | null = null;

  setScreenMonitor(monitor: ScreenMonitor): void {
    this.screenMonitor = monitor;
  }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.audioCaptureManager = new AudioCaptureManager(mainWindow, {
      onChunkUploaded: () => {
        this.actor.send({ type: 'AUDIO_CHUNK_READY', audioData: '', durationSec: 0, capturedAt: '' });
      },
    });

    const snapshot = this.loadSnapshot();
    this.actor = createActor(sessionMachine, snapshot ? { snapshot } : undefined);

    this.actor.subscribe((state) => this.onStateChange(state));
    this.actor.start();

    this.registerIpcHandlers();
  }

  // ============================================================================
  // State change handler (subscriber utama)
  // ============================================================================

  private onStateChange(state: MachineState): void {
    const currentStateName = state.value as string;

    // Selalu kirim state ke renderer
    this.notifyRenderer(state);

    // Selalu persist snapshot
    this.saveSnapshot();

    // Update tray
    const isSessionActive = ['recording', 'paused', 'processing', 'syncing'].includes(currentStateName);
    updateTraySessionState(isSessionActive, currentStateName === 'paused');
    if (!this.mainWindow.isDestroyed()) {
      refreshTrayMenu(this.mainWindow);
    }

    // Jalankan side effects hanya saat masuk ke state baru
    if (currentStateName !== this.previousStateName) {
      this.onStateEntry(currentStateName, state);
      this.previousStateName = currentStateName;
    }
  }

  private onStateEntry(stateName: string, state: MachineState): void {
    switch (stateName) {
      case 'recording':
        this.handleEnterRecording(state);
        break;
      case 'paused':
        this.handleEnterPaused();
        break;
      case 'processing':
        this.handleEnterProcessing(state);
        break;
      case 'syncing':
        this.handleEnterSyncing(state);
        break;
      case 'done':
        this.handleEnterDone();
        break;
      case 'idle':
        // Screen monitor kembali ke interval polling lebih cepat
        break;
    }
  }

  // ============================================================================
  // Side effects per state entry
  // ============================================================================

  private handleEnterRecording(state: MachineState): void {
    const { context } = state;
    if (!context.sessionId && context.videoInfo) {
      // Sesi baru — buat di backend, audio capture dimulai setelah sessionId diterima
      this.createBackendSession(context.videoInfo);
    } else if (context.sessionId && this.previousStateName === 'paused') {
      // Resume dari pause (user atau auto dari screen monitor)
      this.audioCaptureManager.resume();
      if (context.videoInfo) {
        this.screenMonitor?.lockWindow(context.videoInfo.windowTitle);
      }
    } else if (context.sessionId) {
      // sessionId sudah ada tapi bukan dari paused → app restart dengan snapshot
      // yang tersimpan di tengah rekaman. Python subprocess sudah mati, tidak bisa
      // dilanjutkan — akhiri sesi secara graceful agar backend tidak stuck "active".
      this.actor.send({ type: 'SESSION_END' });
    }

    // Aktifkan polling cepat dan kunci ke window video saat session pertama kali recording
    this.screenMonitor?.setSessionActive(true);
    if (context.videoInfo && !context.sessionId) {
      // Lock akan diset setelah sessionId diterima di createBackendSession
    } else if (context.videoInfo && context.sessionId) {
      this.screenMonitor?.lockWindow(context.videoInfo.windowTitle);
    }
  }

  private handleEnterPaused(): void {
    if (this.previousStateName === 'recording') {
      // Transisi normal dari recording
      this.audioCaptureManager.pause();
    }
    // Jika previousStateName bukan 'recording', ini adalah restore dari snapshot di
    // state paused — tidak ada yang perlu dilakukan, user bisa klik Akhiri Sesi.
  }

  private handleEnterProcessing(state: MachineState): void {
    const { context } = state;
    // Hentikan audio capture — semua chunk sudah direkam
    void this.audioCaptureManager.stop();
    // Tunggu sebentar agar upload terakhir selesai, lalu lanjut ke syncing
    const waitMs = context.chunkCount > 0 ? 3000 : 500;
    setTimeout(() => {
      this.actor.send({ type: 'TRANSCRIPTION_DONE' });
    }, waitMs);
  }

  private handleEnterSyncing(state: MachineState): void {
    const { sessionId } = state.context;
    if (sessionId) {
      this.completeBackendSession(sessionId);
    } else {
      // Tidak ada sessionId, langsung done
      this.actor.send({ type: 'SYNC_COMPLETE' });
    }
  }

  private handleEnterDone(): void {
    this.screenMonitor?.setSessionActive(false);
    this.screenMonitor?.unlockWindow();

    // Auto-reset ke idle setelah 5 detik agar siap menerima sesi baru
    setTimeout(() => {
      const currentState = this.actor.getSnapshot().value as string;
      if (currentState === 'done') {
        this.actor.send({ type: 'RESET' });
      }
    }, 5000);
  }

  // ============================================================================
  // Backend API calls (stub — akan diisi oleh api-client package)
  // ============================================================================

  private async createBackendSession(videoInfo: VideoDetectionInfo): Promise<void> {
    const authToken = store.get('authToken');
    const userId = store.get('userId');
    if (!authToken || !userId) return;

    try {
      const response = await fetch(`${process.env['API_BASE_URL'] ?? 'http://localhost:3000'}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-device-id': `desktop-${userId}`,
        },
        body: JSON.stringify({
          videoTitle: videoInfo.windowTitle,
          sourceApp: videoInfo.appName,
          sourceType: videoInfo.sourceType,
          deviceId: `desktop-${userId}`,
        }),
      });

      if (response.ok) {
        const json = (await response.json()) as { data: { sessionId: string } };
        const newSessionId = json.data.sessionId;
        this.actor.send({ type: 'SET_SESSION_ID', sessionId: newSessionId });
        this.audioCaptureManager.start(newSessionId);
        // Kunci screen monitor ke tab video ini setelah sessionId diterima
        this.screenMonitor?.lockWindow(videoInfo.windowTitle);
      } else if (response.status === 409) {
        // Sesi aktif sudah ada — ambil dan pakai ID-nya
        await this.reuseActiveSession(authToken, videoInfo);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.actor.send({ type: 'SET_ERROR', error: `Gagal membuat sesi: ${message}` });
    }
  }

  private async reuseActiveSession(authToken: string, videoInfo?: VideoDetectionInfo): Promise<void> {
    try {
      const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/v1/sessions?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: { sessions: Array<{ sessionId: string; status: string }> } };
      const active = json.data?.sessions?.find((s) => s.status === 'active');
      if (active?.sessionId) {
        this.actor.send({ type: 'SET_SESSION_ID', sessionId: active.sessionId });
        this.audioCaptureManager.start(active.sessionId);
        if (videoInfo) {
          this.screenMonitor?.lockWindow(videoInfo.windowTitle);
        }
      }
    } catch {
      // Tidak bisa ambil sesi aktif — biarkan tanpa sessionId, akan coba lagi nanti
    }
  }

  private async completeBackendSession(sessionId: string): Promise<void> {
    const authToken = store.get('authToken');
    if (!authToken) {
      this.actor.send({ type: 'SYNC_COMPLETE' });
      return;
    }

    try {
      const response = await fetch(
        `${process.env['API_BASE_URL'] ?? 'http://localhost:3000'}/v1/sessions/${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status: 'completed' }),
        }
      );

      if (response.ok) {
        this.actor.send({ type: 'SYNC_COMPLETE' });
      } else {
        this.actor.send({ type: 'SET_ERROR', error: 'Gagal sync ke server' });
        // Tetap pindah ke done agar tidak stuck di syncing
        this.actor.send({ type: 'SYNC_COMPLETE' });
      }
    } catch {
      // Offline atau error jaringan — selesaikan saja, sync-manager akan retry
      this.actor.send({ type: 'SYNC_COMPLETE' });
    }
  }

  // ============================================================================
  // Notifikasi ke renderer
  // ============================================================================

  private notifyRenderer(state: MachineState): void {
    if (this.mainWindow.isDestroyed()) return;

    const stateName = state.value as string;
    const { context } = state;

    const sessionState: SessionState = {
      status: STATE_TO_STATUS[stateName] ?? 'idle',
      sessionId: context.sessionId,
      videoTitle: context.videoInfo?.windowTitle ?? null,
      sourceApp: context.videoInfo?.appName ?? null,
      sourceType: context.videoInfo?.sourceType ?? null,
      startedAt: context.startTime ? new Date(context.startTime) : null,
      durationSec: context.startTime
        ? Math.floor((Date.now() - new Date(context.startTime).getTime()) / 1000)
        : 0,
      error: context.error,
    };

    this.mainWindow.webContents.send(IPC.SESSION_STATE_CHANGED, sessionState);
  }

  // ============================================================================
  // Video detection callbacks (dipanggil dari ScreenMonitor)
  // ============================================================================

  onVideoDetected(info: VideoDetectionInfo): void {
    this.actor.send({ type: 'VIDEO_DETECTED', videoInfo: info });
  }

  onVideoStopped(): void {
    const currentState = this.actor.getSnapshot().value as string;
    if (currentState === 'idle') {
      this.actor.send({ type: 'USER_DISMISSED' });
    }
  }

  /** Dipanggil screen monitor saat video di-pause (tidak ada motion > 20 detik). */
  onVideoPaused(): void {
    const currentState = this.actor.getSnapshot().value as string;
    if (currentState === 'recording') {
      this.actor.send({ type: 'USER_PAUSED' });
    }
  }

  /** Dipanggil screen monitor saat video dilanjutkan setelah pause. */
  onVideoResumed(): void {
    const currentState = this.actor.getSnapshot().value as string;
    if (currentState === 'paused') {
      this.actor.send({ type: 'USER_RESUMED' });
    }
  }

  /** Dipanggil screen monitor saat tab video ditutup. */
  onVideoTabClosed(): void {
    const currentState = this.actor.getSnapshot().value as string;
    if (currentState === 'recording' || currentState === 'paused') {
      this.actor.send({ type: 'SESSION_END' });
    }
  }

  // ============================================================================
  // IPC handlers (perintah dari renderer)
  // ============================================================================

  private registerIpcHandlers(): void {
    // Renderer mengkonfirmasi video yang terdeteksi → mulai sesi
    ipcMain.on(IPC.SESSION_START, () => {
      this.actor.send({ type: 'USER_CONFIRMED' });
    });

    // Renderer menolak popup / dismiss sesi
    ipcMain.on(IPC.SESSION_DISMISS, () => {
      this.actor.send({ type: 'USER_DISMISSED' });
    });

    // Renderer jeda sesi
    ipcMain.on(IPC.SESSION_PAUSE, () => {
      this.actor.send({ type: 'USER_PAUSED' });
    });

    // Renderer lanjutkan sesi
    ipcMain.on(IPC.SESSION_RESUME, () => {
      this.actor.send({ type: 'USER_RESUMED' });
    });

    // Renderer akhiri sesi
    ipcMain.on(IPC.SESSION_END, () => {
      this.actor.send({ type: 'SESSION_END' });
    });

  }

  // ============================================================================
  // Network status monitoring
  // ============================================================================

  startNetworkMonitoring(): void {
    const checkOnline = (): void => {
      const isOnline = net.isOnline();
      const current = this.actor.getSnapshot().context.isOnline;
      if (isOnline !== current) {
        this.actor.send({ type: 'ONLINE_STATUS_CHANGED', isOnline });
      }
    };

    // Cek setiap 30 detik
    setInterval(checkOnline, 30_000);
    // Cek awal
    checkOnline();
  }

  // ============================================================================
  // Snapshot persistence
  // ============================================================================

  private saveSnapshot(): void {
    try {
      const snapshot = this.actor.getPersistedSnapshot();
      (store as unknown as { set(key: string, value: unknown): void }).set(
        SNAPSHOT_STORE_KEY,
        JSON.stringify(snapshot)
      );
    } catch {
      // Persistensi gagal — abaikan, sesi berikutnya mulai dari idle
    }
  }

  private loadSnapshot(): MachineState | undefined {
    try {
      const raw = (store as unknown as { get(key: string): unknown }).get(
        SNAPSHOT_STORE_KEY
      );
      if (typeof raw === 'string') {
        return JSON.parse(raw) as MachineState;
      }
    } catch {
      // Snapshot korup atau tidak ada — mulai dari awal
    }
    return undefined;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.saveSnapshot();
    void this.audioCaptureManager.stop();
    this.actor.stop();
  }
}

// ============================================================================
// Factory function untuk dipakai di main/index.ts
// ============================================================================

let sessionManagerInstance: SessionManager | null = null;

export function initializeSessionManager(mainWindow: BrowserWindow): SessionManager {
  sessionManagerInstance = new SessionManager(mainWindow);
  sessionManagerInstance.startNetworkMonitoring();
  return sessionManagerInstance;
}

export function getSessionManager(): SessionManager | null {
  return sessionManagerInstance;
}
