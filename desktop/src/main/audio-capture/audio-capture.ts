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
  private firstChunkReceived = false;
  private noChunkWarningTimer: ReturnType<typeof setTimeout> | null = null;
  private chunkCount = 0;

  constructor(mainWindow: BrowserWindow, callbacks?: { onChunkUploaded?: () => void }) {
    this.mainWindow = mainWindow;
    this.onChunkUploaded = callbacks?.onChunkUploaded;
  }

  // --------------------------------------------------------------------------
  // Logging — forwards to both main-process console and renderer DevTools
  // --------------------------------------------------------------------------

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const prefix = '[AudioCapture]';
    if (level === 'error') console.error(`${prefix} ${message}`);
    else if (level === 'warn') console.warn(`${prefix} ${message}`);
    else console.log(`${prefix} ${message}`);

    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC.DEBUG_LOG, level, `${prefix} ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  start(sessionId: string): void {
    if (this.process) {
      this.log('warn', 'Already running — ignoring start()');
      return;
    }

    this.sessionId = sessionId;
    this.lineBuffer = '';
    this.firstChunkReceived = false;
    this.chunkCount = 0;

    const { exe, args } = getAudioAgentCommand();
    this.log('info', `Spawning audio agent: exe="${exe}" args=${JSON.stringify(args)} packaged=${app.isPackaged} platform=${process.platform}`);

    // Peringatan jika 90 detik tidak ada chunk — kemungkinan audio agent tidak berjalan normal
    // Nota: TIDAK cek this.process karena proses bisa sudah exit sebelum timer ini fire
    this.noChunkWarningTimer = setTimeout(() => {
      if (!this.firstChunkReceived) {
        this.log('warn', 'Tidak ada chunk diterima dalam 90 detik — kemungkinan audio agent gagal');
        this.showCaptureFailedNotification(
          'Audio belum terekam setelah 90 detik. Pastikan:\n' +
          '1. Tidak ada antivirus yang memblokir VSNotes\n' +
          '2. Perangkat audio aktif dan memutar suara\n' +
          '3. "Stereo Mix" diaktifkan di Sound Settings Windows'
        );
      }
    }, 90_000);

    let spawnError = false;
    this.process = spawn(exe, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const startedAt = Date.now();
    this.log('info', `Process spawned pid=${this.process.pid ?? 'unknown'}`);

    this.process.stdout!.on('data', (data: Buffer) => this.onStdoutData(data));
    this.process.stderr!.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) this.log('warn', `[stderr] ${text}`);
    });
    this.process.on('error', (err) => {
      spawnError = true;
      this.onProcessError(err);
    });
    this.process.on('exit', (code, signal) => {
      const aliveMs = Date.now() - startedAt;
      this.log('info', `Process exited code=${code} signal=${signal} aliveMs=${aliveMs} chunksReceived=${this.chunkCount} spawnError=${spawnError}`);
      this.process = null;

      // Jika exit < 3 detik dengan kode error → kemungkinan diblokir antivirus atau tidak ada device
      if (!spawnError && code !== 0 && code !== null && aliveMs < 3_000) {
        this.log('warn', 'Audio agent exited terlalu cepat — kemungkinan diblokir antivirus');
        this.showBlockedByAntivirusDialog();
      }
    });

    const deviceIndex = storeHelpers.getAudioDeviceIndex();
    this.log('info', `Sending start command sessionId=${sessionId} deviceIndex=${deviceIndex ?? 'default'}`);
    this.sendCommand({ action: 'start', sessionId, ...(deviceIndex !== undefined && { deviceIndex }) });
  }

  stop(): Promise<void> {
    if (!this.process) return Promise.resolve();

    if (this.noChunkWarningTimer) {
      clearTimeout(this.noChunkWarningTimer);
      this.noChunkWarningTimer = null;
    }

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
      this.log('warn', `Could not parse stdout line: ${line}`);
      return;
    }

    if (event.type === 'chunk') {
      this.handleChunk(event as AudioChunkEvent);
    } else if (event.type === 'devices') {
      const devices = (event as { type: string; devices: AudioOutputDevice[] }).devices;
      this.log('info', `Received device list: ${devices.length} device(s)`);
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC.AUDIO_DEVICES_LIST, devices);
      }
    } else if (event.type === 'error') {
      const msg = (event as { type: string; message: string }).message;
      this.log('error', `Agent error: ${msg}`);
      this.showCaptureFailedNotification(msg);
    } else {
      this.log('info', `Unknown event type from agent: ${event.type}`);
    }
  }

  private handleChunk(chunk: AudioChunkEvent): void {
    const sessionId = this.sessionId;
    if (!sessionId) return;

    this.chunkCount++;

    if (!this.firstChunkReceived) {
      this.firstChunkReceived = true;
      if (this.noChunkWarningTimer) {
        clearTimeout(this.noChunkWarningTimer);
        this.noChunkWarningTimer = null;
      }
      this.log('info', `First chunk received — audio agent berjalan normal`);
    } else {
      this.log('info', `Chunk #${this.chunkCount} received durationSec=${chunk.durationSec}`);
    }

    // Fire-and-forget; errors are handled inside
    this.uploadChunk(sessionId, chunk).catch((err) => {
      this.log('error', `Unhandled upload error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private async uploadChunk(sessionId: string, chunk: AudioChunkEvent): Promise<void> {
    const token = storeHelpers.getAuthToken();
    const apiClient = createApiClient(API_BASE_URL, token);
    this.log('info', `Uploading chunk #${this.chunkCount} sessionId=${sessionId} hasToken=${!!token}`);

    try {
      await uploadWithRetry(apiClient, sessionId, chunk);
      this.log('info', `Chunk #${this.chunkCount} uploaded successfully`);

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
      this.log('error', `All retries failed, queuing chunk: ${message}`);

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
    this.log('error', `Process spawn error: ${err.message} (code=${(err as NodeJS.ErrnoException).code})`);

    const isNotFound =
      (err as NodeJS.ErrnoException).code === 'ENOENT' ||
      err.message.includes('ENOENT');
    const isPermissionError =
      err.message.includes('EACCES') ||
      err.message.includes('EPERM') ||
      err.message.includes('permission');

    const body = isNotFound
      ? `Audio agent tidak ditemukan di: ${getAudioAgentCommand().exe}`
      : isPermissionError
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
