/**
 * AudioCaptureManager
 * Spawns the Python audio agent subprocess, parses its stdout line-by-line,
 * uploads each audio chunk to the cloud backend with retry + exponential backoff,
 * and queues failures to SQLite for later sync.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app, BrowserWindow, Notification, dialog, shell } from 'electron';
import { createApiClient } from '@vsnotes/api-client';
import { storeHelpers } from '@main/config/store';
import { insertOperation } from '@main/sync/database';
import * as IPC from '@shared/events/ipc-events';
import type { AudioCommand, AudioChunkEvent, AudioOutputDevice } from '@shared/types';

// ============================================================================
// Config
// ============================================================================

const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 3 attempts, exponential backoff

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAudioAgentCommand(): { exe: string; args: string[] } {
  if (app.isPackaged && process.platform === 'win32') {
    // Packaged Windows: pakai exe standalone — tidak butuh Python terinstall
    return { exe: path.join(process.resourcesPath, 'python', 'audio_agent.exe'), args: [] };
  }
  if (app.isPackaged) {
    // Packaged non-Windows: masih pakai script
    const script = path.join(process.resourcesPath, 'python', 'audio_agent.py');
    return { exe: 'python3', args: [script] };
  }
  // Development
  const script = path.join(app.getAppPath(), 'python', 'audio_agent.py');
  const pyExe = process.platform === 'win32' ? 'python' : 'python3';
  return { exe: pyExe, args: [script] };
}

async function uploadWithRetry(
  apiClient: ReturnType<typeof createApiClient>,
  sessionId: string,
  chunk: AudioChunkEvent
): Promise<void> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await apiClient.uploadAudio(sessionId, {
        audioData: chunk.audioData,
        durationSec: chunk.durationSec,
        capturedAt: chunk.capturedAt,
      });
      return; // success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

// ============================================================================
// AudioCaptureManager
// ============================================================================

export class AudioCaptureManager {
  private process: ChildProcess | null = null;
  private sessionId: string | null = null;
  private lineBuffer: string = '';
  private mainWindow: BrowserWindow;
  private onChunkUploaded?: () => void;

  constructor(mainWindow: BrowserWindow, callbacks?: { onChunkUploaded?: () => void }) {
    this.mainWindow = mainWindow;
    this.onChunkUploaded = callbacks?.onChunkUploaded;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  start(sessionId: string): void {
    if (this.process) {
      console.warn('[AudioCaptureManager] Already running — ignoring start()');
      return;
    }

    this.sessionId = sessionId;
    this.lineBuffer = '';

    const { exe, args } = getAudioAgentCommand();

    this.process = spawn(exe, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const startedAt = Date.now();

    this.process.stdout!.on('data', (data: Buffer) => this.onStdoutData(data));
    this.process.stderr!.on('data', (data: Buffer) => {
      console.log(`[audio_agent] ${data.toString().trim()}`);
    });
    this.process.on('error', (err) => this.onProcessError(err));
    this.process.on('exit', (code) => {
      const aliveMs = Date.now() - startedAt;
      console.log(`[AudioCaptureManager] Process exited code=${code} aliveMs=${aliveMs}`);
      this.process = null;

      // Jika exit < 3 detik dengan kode error → kemungkinan diblokir antivirus atau tidak ada device
      if (code !== 0 && code !== null && aliveMs < 3_000) {
        this.showBlockedByAntivirusDialog();
      }
    });

    const deviceIndex = storeHelpers.getAudioDeviceIndex();
    this.sendCommand({ action: 'start', sessionId, ...(deviceIndex !== undefined && { deviceIndex }) });
  }

  stop(): Promise<void> {
    if (!this.process) return Promise.resolve();

    this.sendCommand({ action: 'stop' });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill();
        resolve();
      }, 5000);

      this.process!.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        this.sessionId = null;
        resolve();
      });
    });
  }

  pause(): void {
    this.sendCommand({ action: 'pause' });
  }

  resume(): void {
    this.sendCommand({ action: 'resume' });
  }

  listDevices(): void {
    this.sendCommand({ action: 'list_devices' });
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private sendCommand(cmd: AudioCommand): void {
    if (!this.process?.stdin?.writable) return;
    this.process.stdin.write(JSON.stringify(cmd) + '\n');
  }

  private onStdoutData(data: Buffer): void {
    this.lineBuffer += data.toString();
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() ?? ''; // keep the last (possibly incomplete) line

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.handleLine(trimmed);
    }
  }

  private handleLine(line: string): void {
    let event: { type: string };
    try {
      event = JSON.parse(line);
    } catch {
      console.warn('[AudioCaptureManager] Could not parse stdout line:', line);
      return;
    }

    if (event.type === 'chunk') {
      this.handleChunk(event as AudioChunkEvent);
    } else if (event.type === 'devices') {
      const devices = (event as { type: string; devices: AudioOutputDevice[] }).devices;
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC.AUDIO_DEVICES_LIST, devices);
      }
    } else if (event.type === 'error') {
      const msg = (event as { type: string; message: string }).message;
      console.error('[AudioCaptureManager] Agent error:', msg);
      this.showCaptureFailedNotification(msg);
    }
  }

  private handleChunk(chunk: AudioChunkEvent): void {
    const sessionId = this.sessionId;
    if (!sessionId) return;

    // Fire-and-forget; errors are handled inside
    this.uploadChunk(sessionId, chunk).catch((err) => {
      console.error('[AudioCaptureManager] Unhandled upload error:', err);
    });
  }

  private async uploadChunk(sessionId: string, chunk: AudioChunkEvent): Promise<void> {
    const token = storeHelpers.getAuthToken();
    const apiClient = createApiClient(API_BASE_URL, token);

    try {
      await uploadWithRetry(apiClient, sessionId, chunk);

      this.onChunkUploaded?.();

      // Notify renderer of successful upload (for UI progress indicator)
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC.AUDIO_CHUNK_UPLOADED, {
          sessionId,
          capturedAt: chunk.capturedAt,
          durationSec: chunk.durationSec,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[AudioCaptureManager] All retries failed, queuing chunk:', message);

      // Persist to SQLite pending_operations for later sync
      insertOperation({
        operationType: 'create',
        resourceType: 'audio',
        resourceId: sessionId,
        payload: JSON.stringify({
          audioData: chunk.audioData,
          durationSec: chunk.durationSec,
          capturedAt: chunk.capturedAt,
        }),
        retryCount: 0,
        lastAttempt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      this.showCaptureFailedNotification(
        'Gagal mengunggah audio. Data disimpan dan akan dicoba ulang saat online.'
      );
    }
  }

  private onProcessError(err: Error): void {
    console.error('[AudioCaptureManager] Process error:', err.message);

    const isPermissionError =
      err.message.includes('EACCES') ||
      err.message.includes('EPERM') ||
      err.message.includes('permission');

    const body = isPermissionError
      ? 'Izin ditolak untuk merekam audio sistem. Periksa pengaturan izin di Pengaturan Sistem.'
      : `Gagal memulai audio capture: ${err.message}`;

    this.showCaptureFailedNotification(body);
    this.process = null;
    this.sessionId = null;
  }

  private showCaptureFailedNotification(body: string): void {
    if (Notification.isSupported()) {
      new Notification({ title: 'Audio Capture Gagal', body }).show();
    }
  }

  private showBlockedByAntivirusDialog(): void {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    dialog.showMessageBox(win ?? new BrowserWindow({ show: false }), {
      type: 'warning',
      title: 'Audio Capture Diblokir',
      message: 'Audio capture tidak bisa dimulai',
      detail:
        'Windows Security kemungkinan memblokir komponen audio VSNotes (audio_agent.exe).\n\n' +
        'Cara mengizinkan:\n' +
        '1. Klik "Buka Windows Security" di bawah\n' +
        '2. Pilih "Virus & threat protection"\n' +
        '3. Klik "Protection history"\n' +
        '4. Temukan entri VSNotes / audio_agent → klik "Allow"\n' +
        '5. Restart VSNotes\n\n' +
        'Jika tidak ada entri, tambahkan folder instalasi VSNotes ke Exclusions.',
      buttons: ['Buka Windows Security', 'Nanti'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        void shell.openExternal('windowsdefender://threat');
      }
    }).catch(() => {});
  }
}
