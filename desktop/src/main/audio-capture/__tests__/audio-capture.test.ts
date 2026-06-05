import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { BrowserWindow } from 'electron';
import { AudioCaptureManager } from '../audio-capture';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('child_process', () => ({ spawn: vi.fn() }));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/app',
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn().mockReturnValue(false),
    prototype: {},
  },
}));

vi.mock('@vsnotes/api-client', () => ({
  createApiClient: vi.fn(),
}));

vi.mock('@main/config/store', () => ({
  storeHelpers: {
    getAuthToken: vi.fn().mockReturnValue('mock-token'),
    getAudioDeviceIndex: vi.fn().mockReturnValue(undefined),
  },
}));

vi.mock('@main/sync/database', () => ({
  insertOperation: vi.fn(),
}));

vi.mock('@shared/events/ipc-events', () => ({
  AUDIO_DEVICES_LIST: 'audio:devices-list',
  AUDIO_CHUNK_UPLOADED: 'audio:chunk-uploaded',
}));

import { spawn } from 'child_process';
import { createApiClient } from '@vsnotes/api-client';
import { storeHelpers } from '@main/config/store';
import { insertOperation } from '@main/sync/database';

// ============================================================================
// Mock ChildProcess Factory
// ============================================================================

class MockProcess extends EventEmitter {
  stdin = {
    writable: true,
    write: vi.fn(),
  };
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn();

  simulateStdout(data: string) {
    this.stdout.emit('data', Buffer.from(data));
  }

  simulateExit(code = 0) {
    this.emit('exit', code);
  }

  simulateError(err: Error) {
    this.emit('error', err);
  }
}

function createMockProcess(): MockProcess {
  const proc = new MockProcess();
  vi.mocked(spawn).mockReturnValue(proc as never);
  return proc;
}

function makeWindow() {
  return {
    isDestroyed: () => false,
    webContents: { send: vi.fn() },
  } as unknown as BrowserWindow;
}

function makeApiClient(uploadFn = vi.fn().mockResolvedValue(undefined)) {
  const client = { uploadAudio: uploadFn };
  vi.mocked(createApiClient).mockReturnValue(client as never);
  return client;
}

function makeChunk(overrides?: Partial<{
  audioData: string;
  durationSec: number;
  capturedAt: string;
  sessionId: string;
}>) {
  return {
    type: 'chunk',
    sessionId: 'session-1',
    audioData: Buffer.from('fake-audio').toString('base64'),
    durationSec: 30,
    capturedAt: '2026-01-01T00:00:30.000Z',
    ...overrides,
  };
}

// Tunggu semua pending microtask/promise selesai
const flush = () => new Promise((r) => setTimeout(r, 0));

// ============================================================================
// Tests
// ============================================================================

describe('AudioCaptureManager', () => {
  let manager: AudioCaptureManager;
  let window: ReturnType<typeof makeWindow>;
  let proc: MockProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    proc = createMockProcess();
    window = makeWindow();
    manager = new AudioCaptureManager(window);
  });

  // =========================================================================
  // start() — spawn & command
  // =========================================================================

  describe('start()', () => {
    it('spawn Python process dan kirim command start', () => {
      manager.start('session-1');

      expect(spawn).toHaveBeenCalledOnce();
      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"start"')
      );
      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"sessionId":"session-1"')
      );
    });

    it('tidak spawn dua kali jika sudah berjalan', () => {
      manager.start('session-1');
      manager.start('session-2'); // duplikat

      expect(spawn).toHaveBeenCalledOnce();
    });

    it('menyertakan deviceIndex jika ada di store', () => {
      vi.mocked(storeHelpers.getAudioDeviceIndex).mockReturnValue(2);
      manager.start('session-1');

      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"deviceIndex":2')
      );
    });
  });

  // =========================================================================
  // Parsing AudioChunkEvent dari stdout
  // =========================================================================

  describe('parsing stdout — AudioChunkEvent', () => {
    it('mem-parse chunk event dari satu baris JSON', async () => {
      const client = makeApiClient();
      manager.start('session-1');

      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      await flush();

      expect(client.uploadAudio).toHaveBeenCalledOnce();
      expect(client.uploadAudio).toHaveBeenCalledWith('session-1', expect.objectContaining({
        audioData: makeChunk().audioData,
        durationSec: 30,
      }));
    });

    it('mem-parse banyak chunk dari data stdout yang digabung', async () => {
      const client = makeApiClient();
      manager.start('session-1');

      // Dua chunk dalam satu data event (bisa terjadi di buffer TCP)
      const combined =
        JSON.stringify(makeChunk({ capturedAt: '2026-01-01T00:00:30.000Z' })) + '\n' +
        JSON.stringify(makeChunk({ capturedAt: '2026-01-01T00:01:00.000Z' })) + '\n';

      proc.simulateStdout(combined);
      await flush();

      expect(client.uploadAudio).toHaveBeenCalledTimes(2);
    });

    it('menangani baris yang datang terpotong (streaming buffer)', async () => {
      const client = makeApiClient();
      manager.start('session-1');
      const json = JSON.stringify(makeChunk());

      // Kirim setengah-setengah
      proc.simulateStdout(json.slice(0, 20));
      proc.simulateStdout(json.slice(20) + '\n');
      await flush();

      expect(client.uploadAudio).toHaveBeenCalledOnce();
    });

    it('mengabaikan baris yang bukan JSON valid', async () => {
      const client = makeApiClient();
      manager.start('session-1');

      proc.simulateStdout('ini bukan json\n');
      await flush();

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });

    it('emit AUDIO_CHUNK_UPLOADED ke renderer setelah upload berhasil', async () => {
      makeApiClient();
      manager.start('session-1');

      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      await flush();

      expect(window.webContents.send).toHaveBeenCalledWith(
        'audio:chunk-uploaded',
        expect.objectContaining({ sessionId: 'session-1' })
      );
    });

    it('memanggil onChunkUploaded callback setelah upload berhasil', async () => {
      makeApiClient();
      const onChunkUploaded = vi.fn();
      manager = new AudioCaptureManager(window, { onChunkUploaded });
      proc = createMockProcess();
      manager.start('session-1');

      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      await flush();

      expect(onChunkUploaded).toHaveBeenCalledOnce();
    });

    it('mengirim devices list ke renderer saat menerima devices event', async () => {
      manager.start('session-1');
      const devicesEvent = JSON.stringify({
        type: 'devices',
        devices: [{ index: 0, name: 'Speakers (Realtek)' }],
      });

      proc.simulateStdout(devicesEvent + '\n');
      await flush();

      expect(window.webContents.send).toHaveBeenCalledWith(
        'audio:devices-list',
        [{ index: 0, name: 'Speakers (Realtek)' }]
      );
    });
  });

  // =========================================================================
  // Retry saat upload gagal
  // =========================================================================

  describe('retry upload chunk', () => {
    it('retry dan berhasil pada percobaan kedua', async () => {
      const uploadFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);
      makeApiClient(uploadFn);
      manager.start('session-1');

      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      // Tunggu retry (1s backoff di-skip karena fake timer tidak dipakai, tapi upload-nya async)
      await new Promise((r) => setTimeout(r, 1500));

      expect(uploadFn).toHaveBeenCalledTimes(2);
      expect(insertOperation).not.toHaveBeenCalled();
    }, 5000);

    it('retry 3x lalu simpan ke SQLite setelah semua gagal', async () => {
      const uploadFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
      makeApiClient(uploadFn);
      manager.start('session-1');

      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      // 4 total attempts: 1 + 3 retry, backoff 1s+2s+4s = 7s
      await new Promise((r) => setTimeout(r, 8000));

      // 4 percobaan (attempt 0,1,2,3 — loop <= RETRY_DELAYS_MS.length)
      expect(uploadFn).toHaveBeenCalledTimes(4);
      expect(insertOperation).toHaveBeenCalledOnce();
      expect(insertOperation).toHaveBeenCalledWith(expect.objectContaining({
        operationType: 'create',
        resourceType: 'audio',
        resourceId: 'session-1',
      }));
    }, 15000);

    it('tidak mengupload jika tidak ada sessionId aktif', async () => {
      const client = makeApiClient();
      // manager baru, belum start → sessionId = null
      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      await flush();

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Graceful shutdown — stop()
  // =========================================================================

  describe('stop()', () => {
    it('mengirim command stop ke Python process', async () => {
      manager.start('session-1');

      const stopPromise = manager.stop();
      proc.simulateExit(0);
      await stopPromise;

      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"stop"')
      );
    });

    it('membersihkan sessionId dan process reference setelah stop', async () => {
      manager.start('session-1');

      const stopPromise = manager.stop();
      proc.simulateExit(0);
      await stopPromise;

      // Process sudah null → start ulang bisa dilakukan
      const proc2 = createMockProcess();
      manager.start('session-2');
      expect(proc2.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"sessionId":"session-2"')
      );
    });

    it('force-kill process setelah timeout 5 detik', async () => {
      vi.useFakeTimers();
      manager.start('session-1');

      const stopPromise = manager.stop();
      // Process tidak exit → timeout 5s → force kill
      vi.advanceTimersByTime(5001);
      await stopPromise;

      expect(proc.kill).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('tidak melakukan apa-apa jika process sudah null', async () => {
      // Belum di-start
      await expect(manager.stop()).resolves.toBeUndefined();
      expect(proc.stdin.write).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // pause() & resume()
  // =========================================================================

  describe('pause() & resume()', () => {
    it('mengirim command pause dan resume', () => {
      manager.start('session-1');
      manager.pause();
      manager.resume();

      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"pause"')
      );
      expect(proc.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"resume"')
      );
    });
  });

  // =========================================================================
  // Error handling — Python process crashes
  // =========================================================================

  describe('error handling — Python process crashes', () => {
    it('membersihkan state saat process error', () => {
      manager.start('session-1');

      proc.simulateError(new Error('ENOENT: python not found'));

      // Process di-null, sessionId dibersihkan
      // start() lagi harus bisa spawn process baru
      const proc2 = createMockProcess();
      manager.start('session-2');
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(proc2.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"sessionId":"session-2"')
      );
    });

    it('membersihkan state saat process exit mendadak (crash)', () => {
      manager.start('session-1');

      proc.simulateExit(1); // exit code 1 = crash

      // Spawn lagi bisa dilakukan setelah crash
      createMockProcess();
      manager.start('session-new');
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('tidak upload chunk yang datang setelah process error', async () => {
      const client = makeApiClient();
      manager.start('session-1');
      proc.simulateError(new Error('Fatal error'));

      // Chunk datang setelah error (tidak seharusnya, tapi defensive)
      proc.simulateStdout(JSON.stringify(makeChunk()) + '\n');
      await flush();

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });
  });
});
