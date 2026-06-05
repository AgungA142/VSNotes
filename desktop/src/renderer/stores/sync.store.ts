/**
 * Sync Store (Zustand)
 * Manages offline queue status indicator
 * 
 * This store tracks the sync status between local cache and cloud backend.
 * Updated via IPC events from main process sync manager.
 */

import { create } from 'zustand';
import type { SyncStatus } from '../../shared/types';

interface SyncStore extends SyncStatus {
  pendingCount: number;

  // Actions
  updateStatus: (status: Partial<SyncStatus & { pendingCount: number }>) => void;
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  updateQueue: (queueSize: number) => void;
  setPendingCount: (pendingCount: number) => void;
  setLastSync: (lastSyncAt: Date) => void;
  setLastSyncTime: (lastSyncAt: Date | null) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  // Initial state
  isOnline: navigator.onLine,
  queueSize: 0,
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,

  // Actions
  updateStatus: (status) => set((prev) => ({ ...prev, ...status })),

  setOnline: (isOnline) => set({ isOnline }),

  setSyncing: (isSyncing) => set({ isSyncing }),

  updateQueue: (queueSize) => set({ queueSize }),

  setPendingCount: (pendingCount) => set({ pendingCount }),

  setLastSync: (lastSyncAt) => set({ lastSyncAt }),

  setLastSyncTime: (lastSyncAt) => set({ lastSyncAt }),
}));
