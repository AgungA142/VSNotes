/**
 * SyncManager
 * Orchestrates offline → cloud sync for sessions, notes, and audio chunks.
 *
 * Flow:
 *   - queueOperation()  : persist operation to SQLite pending_operations
 *   - flushQueue()      : replay all pending operations against the cloud API (FIFO)
 *   - Network polling   : auto-trigger flushQueue() when connection is restored
 *   - Conflict resolution: last-write-wins via updatedAt timestamps
 */

import { net, BrowserWindow, ipcMain } from 'electron';
import { createApiClient } from '@vsnotes/api-client';
import { storeHelpers } from '@main/config/store';
import {
  getAllPendingOperations,
  insertOperation,
  deleteOperation,
  incrementRetryCount,
  type PendingOperation,
  type OperationType,
  type ResourceType,
} from '@main/sync/database';
import * as IPC from '@shared/events/ipc-events';

// ============================================================================
// Types
// ============================================================================

export interface QueueEntry {
  operationType: OperationType;
  resourceType: ResourceType;
  resourceId: string;
  payload: Record<string, unknown>;
}

interface SyncStatusPayload {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncAt: string | null;
}

// ============================================================================
// SyncManager
// ============================================================================

const POLL_INTERVAL_MS = 30_000;
const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

export class SyncManager {
  private mainWindow: BrowserWindow;
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncAt: Date | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onOnlineRestored: (() => void) | undefined;

  constructor(mainWindow: BrowserWindow, onOnlineRestored?: () => void) {
    this.mainWindow = mainWindow;
    this.onOnlineRestored = onOnlineRestored;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    this.isOnline = net.isOnline();

    // Register IPC handler for renderer-triggered sync
    ipcMain.on(IPC.SYNC_START, () => {
      this.flushQueue().catch((err) =>
        console.error('[SyncManager] flushQueue error:', err)
      );
    });

    // Poll for connectivity changes every 30 s
    this.pollTimer = setInterval(() => this.checkConnectivity(), POLL_INTERVAL_MS);

    // Initial flush if already online
    if (this.isOnline) {
      this.flushQueue().catch(() => undefined);
    }
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    ipcMain.removeAllListeners(IPC.SYNC_START);
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Persist a failed operation to the local SQLite queue for later replay. */
  queueOperation(entry: QueueEntry): void {
    insertOperation({
      operationType: entry.operationType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      payload: JSON.stringify(entry.payload),
      retryCount: 0,
      lastAttempt: null,
      createdAt: new Date().toISOString(),
    });
    this.emitStatus();
  }

  /** Process all pending operations in FIFO order. */
  async flushQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const ops = getAllPendingOperations();
    if (ops.length === 0) return;

    this.isSyncing = true;
    this.emitStatus();

    const token = storeHelpers.getAuthToken();
    const apiClient = createApiClient(API_BASE_URL, token);

    let successCount = 0;
    let errorCount = 0;

    for (const op of ops) {
      try {
        await this.executeOperation(apiClient, op);
        deleteOperation(op.id);
        successCount++;
      } catch (err) {
        const status = this.extractHttpStatus(err);
        // 400/404/410 are permanent failures — retrying will never succeed
        const isNonRetryable = status === 400 || status === 404 || status === 410;
        if (isNonRetryable) {
          deleteOperation(op.id);
          console.warn(`[SyncManager] Op ${op.id} (${op.resourceType}/${op.resourceId}) permanently failed with ${status}, removed from queue`);
        } else {
          incrementRetryCount(op.id);
          errorCount++;
          console.error(`[SyncManager] Op ${op.id} failed:`, err);
        }
      }
    }

    this.isSyncing = false;
    this.lastSyncAt = new Date();
    storeHelpers.setLastSyncAt(this.lastSyncAt);

    this.emitStatus();

    if (successCount > 0) {
      this.mainWindow.webContents.send(IPC.SYNC_COMPLETE);
    }
    if (errorCount > 0) {
      this.mainWindow.webContents.send(IPC.SYNC_ERROR, new Error(`${errorCount} operation(s) failed`));
    }
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private async executeOperation(
    apiClient: ReturnType<typeof createApiClient>,
    op: PendingOperation
  ): Promise<void> {
    const payload = JSON.parse(op.payload) as Record<string, unknown>;
    const { operationType, resourceType, resourceId } = op;

    if (resourceType === 'audio') {
      // Replay failed audio chunk upload
      await apiClient.uploadAudio(resourceId, {
        audioData: payload.audioData as string,
        durationSec: payload.durationSec as number,
        capturedAt: payload.capturedAt as string,
      });
      return;
    }

    if (resourceType === 'session') {
      if (operationType === 'create') {
        await apiClient.createSession(payload as Parameters<typeof apiClient.createSession>[0]);
      } else if (operationType === 'update') {
        // Conflict resolution: last-write-wins — only update if local updatedAt is newer
        const serverSession = await apiClient.getSession(resourceId).catch(() => null);
        if (serverSession) {
          const serverTime = new Date((serverSession as unknown as { updatedAt?: string }).updatedAt ?? 0).getTime();
          const localTime = new Date((payload.updatedAt as string | undefined) ?? 0).getTime();
          if (serverTime > localTime) return; // server is newer, skip
        }
        await apiClient.updateSession(resourceId, payload as Parameters<typeof apiClient.updateSession>[1]);
      } else if (operationType === 'delete') {
        await apiClient.deleteSession(resourceId);
      }
      return;
    }

    if (resourceType === 'note') {
      if (operationType === 'create') {
        const sessionId = payload.sessionId as string;
        await apiClient.createNote(sessionId, payload as Parameters<typeof apiClient.createNote>[1]);
      } else if (operationType === 'update') {
        // Conflict resolution: last-write-wins
        const serverNotes = await apiClient.getNotes((payload.sessionId as string) ?? '').catch(() => [] as Awaited<ReturnType<typeof apiClient.getNotes>>);
        const serverNote = serverNotes.find((n) => (n as unknown as { id: string }).id === resourceId);
        if (serverNote) {
          const serverTime = new Date((serverNote as unknown as { updatedAt?: string }).updatedAt ?? 0).getTime();
          const localTime = new Date((payload.updatedAt as string | undefined) ?? 0).getTime();
          if (serverTime > localTime) return; // server is newer, skip
        }
        await apiClient.updateNote(resourceId, payload as Parameters<typeof apiClient.updateNote>[1]);
      } else if (operationType === 'delete') {
        await apiClient.deleteNote(resourceId);
      }
      return;
    }
  }

  private extractHttpStatus(err: unknown): number | null {
    if (err && typeof err === 'object') {
      // Axios: err.response.status
      const axiosStatus = (err as { response?: { status?: number } }).response?.status;
      if (typeof axiosStatus === 'number') return axiosStatus;
      // Plain fetch wrapper: err.status
      const directStatus = (err as { status?: number }).status;
      if (typeof directStatus === 'number') return directStatus;
    }
    return null;
  }

  private checkConnectivity(): void {
    const wasOnline = this.isOnline;
    this.isOnline = net.isOnline();

    if (!wasOnline && this.isOnline) {
      this.onOnlineRestored?.();
      this.flushQueue().catch((err) =>
        console.error('[SyncManager] Auto-flush error:', err)
      );
    } else {
      this.emitStatus();
    }
  }

  private emitStatus(): void {
    if (this.mainWindow.isDestroyed()) return;

    const pending = getAllPendingOperations();
    const payload: SyncStatusPayload = {
      pendingCount: pending.length,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
    };

    this.mainWindow.webContents.send(IPC.SYNC_STATUS_CHANGED, payload);
  }
}
