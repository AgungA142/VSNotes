import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { SyncManager } from '../sync-manager';

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockNetIsOnline,
  mockGetAllPendingOperations,
  mockInsertOperation,
  mockDeleteOperation,
  mockIncrementRetryCount,
  mockIpcMainOn,
  mockIpcMainRemoveAllListeners,
} = vi.hoisted(() => ({
  mockNetIsOnline: vi.fn().mockReturnValue(true),
  mockGetAllPendingOperations: vi.fn().mockReturnValue([]),
  mockInsertOperation: vi.fn(),
  mockDeleteOperation: vi.fn(),
  mockIncrementRetryCount: vi.fn(),
  mockIpcMainOn: vi.fn(),
  mockIpcMainRemoveAllListeners: vi.fn(),
}));

vi.mock('electron', () => ({
  net: { isOnline: mockNetIsOnline },
  BrowserWindow: vi.fn(),
  ipcMain: {
    on: mockIpcMainOn,
    removeAllListeners: mockIpcMainRemoveAllListeners,
  },
}));

vi.mock('@vsnotes/api-client', () => ({
  createApiClient: vi.fn(),
}));

vi.mock('@main/config/store', () => ({
  storeHelpers: {
    getAuthToken: vi.fn().mockReturnValue('mock-token'),
    setLastSyncAt: vi.fn(),
  },
}));

vi.mock('@main/sync/database', () => ({
  getAllPendingOperations: mockGetAllPendingOperations,
  insertOperation: mockInsertOperation,
  deleteOperation: mockDeleteOperation,
  incrementRetryCount: mockIncrementRetryCount,
}));

vi.mock('@shared/events/ipc-events', () => ({
  SYNC_START: 'sync:start',
  SYNC_COMPLETE: 'sync:complete',
  SYNC_ERROR: 'sync:error',
  SYNC_STATUS_CHANGED: 'sync:status-changed',
}));

import { createApiClient } from '@vsnotes/api-client';

// ============================================================================
// Helpers
// ============================================================================

function setPrivate(obj: unknown, key: string, val: unknown) {
  (obj as Record<string, unknown>)[key] = val;
}

function makeWindow() {
  return {
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: { send: vi.fn() },
  } as unknown as BrowserWindow;
}

interface MockApiClient {
  uploadAudio: ReturnType<typeof vi.fn>;
  createSession: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  updateSession: ReturnType<typeof vi.fn>;
  deleteSession: ReturnType<typeof vi.fn>;
  createNote: ReturnType<typeof vi.fn>;
  getNotes: ReturnType<typeof vi.fn>;
  updateNote: ReturnType<typeof vi.fn>;
  deleteNote: ReturnType<typeof vi.fn>;
}

function makeApiClient(overrides: Partial<MockApiClient> = {}): MockApiClient {
  const client: MockApiClient = {
    uploadAudio: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue(null),
    updateSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    createNote: vi.fn().mockResolvedValue(undefined),
    getNotes: vi.fn().mockResolvedValue([]),
    updateNote: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(createApiClient).mockReturnValue(client as never);
  return client;
}

interface PendingOp {
  id: number;
  operationType: string;
  resourceType: string;
  resourceId: string;
  payload: string;
  retryCount: number;
  lastAttempt: string | null;
  createdAt: string;
}

function makeAudioOp(overrides: Partial<PendingOp> = {}): PendingOp {
  return {
    id: 1,
    operationType: 'create',
    resourceType: 'audio',
    resourceId: 'session-1',
    payload: JSON.stringify({
      audioData: 'base64chunk',
      durationSec: 30,
      capturedAt: '2026-01-01T00:00:30.000Z',
    }),
    retryCount: 0,
    lastAttempt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeOp(overrides: Partial<PendingOp>): PendingOp {
  return makeAudioOp(overrides);
}

// ============================================================================
// Tests
// ============================================================================

describe('SyncManager', () => {
  let manager: SyncManager;
  let mainWindow: ReturnType<typeof makeWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNetIsOnline.mockReturnValue(true);
    mockGetAllPendingOperations.mockReturnValue([]);
    mainWindow = makeWindow();
    manager = new SyncManager(mainWindow);
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  // ==========================================================================
  // queueOperation() — offline queue
  // ==========================================================================

  describe('queueOperation() — offline storage', () => {
    it('menyimpan operasi ke SQLite dengan field yang benar', () => {
      manager.queueOperation({
        operationType: 'create',
        resourceType: 'session',
        resourceId: 'session-123',
        payload: { videoTitle: 'Test Video' },
      });

      expect(mockInsertOperation).toHaveBeenCalledOnce();
      expect(mockInsertOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'create',
          resourceType: 'session',
          resourceId: 'session-123',
          retryCount: 0,
        })
      );
    });

    it('serialisasi payload ke JSON string', () => {
      manager.queueOperation({
        operationType: 'create',
        resourceType: 'note',
        resourceId: 'note-1',
        payload: { text: 'Catatan penting', timestampSec: 42 },
      });

      const call = mockInsertOperation.mock.calls[0][0] as { payload: string };
      expect(typeof call.payload).toBe('string');
      const parsed = JSON.parse(call.payload);
      expect(parsed).toEqual({ text: 'Catatan penting', timestampSec: 42 });
    });

    it('mengirim status update ke renderer setelah antrian', () => {
      manager.queueOperation({
        operationType: 'delete',
        resourceType: 'session',
        resourceId: 'session-1',
        payload: {},
      });

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'sync:status-changed',
        expect.objectContaining({ pendingCount: expect.any(Number) })
      );
    });
  });

  // ==========================================================================
  // flushQueue() — online flush
  // ==========================================================================

  describe('flushQueue()', () => {
    it('tidak memproses apapun saat offline', async () => {
      setPrivate(manager, 'isOnline', false);
      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.uploadAudio).not.toHaveBeenCalled();
      expect(mockDeleteOperation).not.toHaveBeenCalled();
    });

    it('tidak memproses saat sedang sync (concurrent guard)', async () => {
      setPrivate(manager, 'isOnline', true);
      setPrivate(manager, 'isSyncing', true);
      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });

    it('tidak memanggil API jika antrian kosong', async () => {
      setPrivate(manager, 'isOnline', true);
      mockGetAllPendingOperations.mockReturnValue([]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.uploadAudio).not.toHaveBeenCalled();
      expect(mainWindow.webContents.send).not.toHaveBeenCalledWith('sync:complete');
    });

    it('audio op → memanggil uploadAudio lalu deleteOperation', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeAudioOp({
        id: 10,
        resourceId: 'session-1',
        payload: JSON.stringify({
          audioData: 'base64chunk',
          durationSec: 30,
          capturedAt: '2026-01-01T00:00:30.000Z',
        }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.uploadAudio).toHaveBeenCalledWith('session-1', {
        audioData: 'base64chunk',
        durationSec: 30,
        capturedAt: '2026-01-01T00:00:30.000Z',
      });
      expect(mockDeleteOperation).toHaveBeenCalledWith(10);
    });

    it('session/create op → memanggil createSession lalu deleteOperation', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeOp({
        id: 20,
        operationType: 'create',
        resourceType: 'session',
        resourceId: 'session-new',
        payload: JSON.stringify({ videoTitle: 'Test', sourceApp: 'Chrome' }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.createSession).toHaveBeenCalledOnce();
      expect(mockDeleteOperation).toHaveBeenCalledWith(20);
    });

    it('session/delete op → memanggil deleteSession', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeOp({
        id: 30,
        operationType: 'delete',
        resourceType: 'session',
        resourceId: 'session-del',
        payload: '{}',
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.deleteSession).toHaveBeenCalledWith('session-del');
      expect(mockDeleteOperation).toHaveBeenCalledWith(30);
    });

    it('note/create op → memanggil createNote dengan sessionId dan payload', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeOp({
        id: 40,
        operationType: 'create',
        resourceType: 'note',
        resourceId: 'note-1',
        payload: JSON.stringify({ sessionId: 'session-1', text: 'Catatan', timestampSec: 10, type: 'manual' }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.createNote).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ text: 'Catatan' })
      );
      expect(mockDeleteOperation).toHaveBeenCalledWith(40);
    });

    it('note/delete op → memanggil deleteNote', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeOp({
        id: 50,
        operationType: 'delete',
        resourceType: 'note',
        resourceId: 'note-del',
        payload: '{}',
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.deleteNote).toHaveBeenCalledWith('note-del');
      expect(mockDeleteOperation).toHaveBeenCalledWith(50);
    });

    it('emits SYNC_COMPLETE setelah ada operasi yang berhasil', async () => {
      setPrivate(manager, 'isOnline', true);
      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      makeApiClient();

      await manager.flushQueue();

      expect(mainWindow.webContents.send).toHaveBeenCalledWith('sync:complete');
    });

    it('error retryable (5xx) → incrementRetryCount dipanggil dan emits SYNC_ERROR', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeAudioOp({ id: 99 });
      mockGetAllPendingOperations.mockReturnValue([op]);
      makeApiClient({
        uploadAudio: vi.fn().mockRejectedValue({ status: 503, message: 'Service Unavailable' }),
      });

      await manager.flushQueue();

      expect(mockIncrementRetryCount).toHaveBeenCalledWith(99);
      expect(mockDeleteOperation).not.toHaveBeenCalled();
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'sync:error',
        expect.any(Error)
      );
    });

    it('error 404 (non-retryable) → deleteOperation dipanggil, bukan incrementRetryCount', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeAudioOp({ id: 77 });
      mockGetAllPendingOperations.mockReturnValue([op]);
      makeApiClient({
        uploadAudio: vi.fn().mockRejectedValue({ status: 404 }),
      });

      await manager.flushQueue();

      expect(mockDeleteOperation).toHaveBeenCalledWith(77);
      expect(mockIncrementRetryCount).not.toHaveBeenCalled();
    });

    it('error 400 (non-retryable) → deleteOperation dipanggil', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeAudioOp({ id: 66 });
      mockGetAllPendingOperations.mockReturnValue([op]);
      makeApiClient({
        uploadAudio: vi.fn().mockRejectedValue({ status: 400 }),
      });

      await manager.flushQueue();

      expect(mockDeleteOperation).toHaveBeenCalledWith(66);
      expect(mockIncrementRetryCount).not.toHaveBeenCalled();
    });

    it('memproses banyak operasi secara FIFO', async () => {
      setPrivate(manager, 'isOnline', true);
      const ops = [
        makeAudioOp({ id: 1, resourceId: 'session-A', payload: JSON.stringify({ audioData: 'a1', durationSec: 10, capturedAt: '2026-01-01T00:00:10.000Z' }) }),
        makeAudioOp({ id: 2, resourceId: 'session-B', payload: JSON.stringify({ audioData: 'a2', durationSec: 20, capturedAt: '2026-01-01T00:00:20.000Z' }) }),
      ];
      mockGetAllPendingOperations.mockReturnValue(ops);
      const client = makeApiClient();

      await manager.flushQueue();

      expect(client.uploadAudio).toHaveBeenCalledTimes(2);
      const firstCallId = vi.mocked(client.uploadAudio).mock.calls[0][0];
      expect(firstCallId).toBe('session-A'); // FIFO order
    });

    it('op yang gagal dicoba ulang pada flushQueue() berikutnya', async () => {
      setPrivate(manager, 'isOnline', true);
      const op = makeAudioOp({ id: 10 });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const uploadFn = vi.fn()
        .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
        .mockResolvedValue(undefined);
      makeApiClient({ uploadAudio: uploadFn });

      // Flush pertama: gagal
      await manager.flushQueue();
      expect(mockIncrementRetryCount).toHaveBeenCalledWith(10);
      expect(mockDeleteOperation).not.toHaveBeenCalled();

      // Flush kedua: berhasil
      await manager.flushQueue();
      expect(uploadFn).toHaveBeenCalledTimes(2);
      expect(mockDeleteOperation).toHaveBeenCalledWith(10);
    });
  });

  // ==========================================================================
  // Conflict resolution
  // ==========================================================================

  describe('conflict resolution — session/update', () => {
    it('melewati update saat server lebih baru (last-write-wins)', async () => {
      setPrivate(manager, 'isOnline', true);
      const localTime = '2026-01-01T10:00:00.000Z';
      const serverTime = '2026-01-01T11:00:00.000Z'; // lebih baru

      const op = makeOp({
        id: 100,
        operationType: 'update',
        resourceType: 'session',
        resourceId: 'session-conflict',
        payload: JSON.stringify({ status: 'completed', updatedAt: localTime }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient({
        getSession: vi.fn().mockResolvedValue({ updatedAt: serverTime }),
      });

      await manager.flushQueue();

      expect(client.updateSession).not.toHaveBeenCalled();
      // Operasi tetap dihapus dari queue (sudah di-resolve via conflict resolution)
      expect(mockDeleteOperation).toHaveBeenCalledWith(100);
    });

    it('mengirim update saat local lebih baru', async () => {
      setPrivate(manager, 'isOnline', true);
      const localTime = '2026-01-01T12:00:00.000Z'; // lebih baru
      const serverTime = '2026-01-01T10:00:00.000Z';

      const op = makeOp({
        id: 101,
        operationType: 'update',
        resourceType: 'session',
        resourceId: 'session-local-newer',
        payload: JSON.stringify({ status: 'completed', updatedAt: localTime }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient({
        getSession: vi.fn().mockResolvedValue({ updatedAt: serverTime }),
      });

      await manager.flushQueue();

      expect(client.updateSession).toHaveBeenCalledWith(
        'session-local-newer',
        expect.objectContaining({ status: 'completed' })
      );
      expect(mockDeleteOperation).toHaveBeenCalledWith(101);
    });
  });

  describe('conflict resolution — note/update', () => {
    it('melewati update note saat server lebih baru', async () => {
      setPrivate(manager, 'isOnline', true);
      const localTime = '2026-01-01T09:00:00.000Z';
      const serverTime = '2026-01-01T10:00:00.000Z'; // lebih baru

      const op = makeOp({
        id: 200,
        operationType: 'update',
        resourceType: 'note',
        resourceId: 'note-conflict',
        payload: JSON.stringify({ sessionId: 'session-1', text: 'Old text', updatedAt: localTime }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient({
        getNotes: vi.fn().mockResolvedValue([{ id: 'note-conflict', updatedAt: serverTime }]),
      });

      await manager.flushQueue();

      expect(client.updateNote).not.toHaveBeenCalled();
    });

    it('mengirim update note saat local lebih baru', async () => {
      setPrivate(manager, 'isOnline', true);
      const localTime = '2026-01-01T11:00:00.000Z'; // lebih baru
      const serverTime = '2026-01-01T10:00:00.000Z';

      const op = makeOp({
        id: 201,
        operationType: 'update',
        resourceType: 'note',
        resourceId: 'note-local-newer',
        payload: JSON.stringify({ sessionId: 'session-1', text: 'Updated text', updatedAt: localTime }),
      });
      mockGetAllPendingOperations.mockReturnValue([op]);
      const client = makeApiClient({
        getNotes: vi.fn().mockResolvedValue([{ id: 'note-local-newer', updatedAt: serverTime }]),
      });

      await manager.flushQueue();

      expect(client.updateNote).toHaveBeenCalledWith(
        'note-local-newer',
        expect.objectContaining({ text: 'Updated text' })
      );
      expect(mockDeleteOperation).toHaveBeenCalledWith(201);
    });
  });

  // ==========================================================================
  // checkConnectivity() — auto reconnect via 30s polling
  // ==========================================================================

  describe('checkConnectivity() — auto reconnect', () => {
    it('memanggil onOnlineRestored saat kembali online', () => {
      const onOnlineRestored = vi.fn();
      mockNetIsOnline.mockReturnValue(false);
      manager = new SyncManager(mainWindow, onOnlineRestored);
      manager.start(); // isOnline = false

      // Come back online
      mockNetIsOnline.mockReturnValue(true);
      vi.advanceTimersByTime(30_001); // trigger polling

      expect(onOnlineRestored).toHaveBeenCalledOnce();
    });

    it('tidak memanggil flushQueue saat tetap offline', async () => {
      mockNetIsOnline.mockReturnValue(false);
      manager = new SyncManager(mainWindow);
      manager.start();

      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      const client = makeApiClient();

      vi.advanceTimersByTime(30_001);
      await Promise.resolve(); // flush microtasks

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });

    it('tidak memanggil onOnlineRestored saat tetap online', () => {
      const onOnlineRestored = vi.fn();
      mockNetIsOnline.mockReturnValue(true);
      // start() consumes initial flush (empty queue)
      manager = new SyncManager(mainWindow, onOnlineRestored);
      manager.start(); // isOnline = true

      vi.advanceTimersByTime(30_001);

      expect(onOnlineRestored).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // start() / stop() lifecycle
  // ==========================================================================

  describe('start() / stop()', () => {
    it('start() memulai flush otomatis jika online dan ada pending ops', async () => {
      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      const client = makeApiClient();

      manager.start();
      await Promise.resolve(); // flush microtasks

      expect(client.uploadAudio).toHaveBeenCalledOnce();
    });

    it('start() tidak flush jika tidak ada pending ops', async () => {
      mockGetAllPendingOperations.mockReturnValue([]);
      const client = makeApiClient();

      manager.start();
      await Promise.resolve();

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });

    it('stop() membersihkan timer sehingga polling berhenti', () => {
      manager.start();
      manager.stop();

      expect(mockIpcMainRemoveAllListeners).toHaveBeenCalledWith('sync:start');

      // Timer dibersihkan — polling 30s berikutnya tidak akan terjadi
      const client = makeApiClient();
      mockGetAllPendingOperations.mockReturnValue([makeAudioOp()]);
      vi.advanceTimersByTime(30_001);

      expect(client.uploadAudio).not.toHaveBeenCalled();
    });
  });
});
