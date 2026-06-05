/**
 * useSyncStatus Hook
 * Subscribes to IPC sync status events and updates Zustand store
 * Provides sync status and commands
 * 
 * This hook combines IPC subscription with Zustand state management.
 */

import { useEffect } from 'react';
import { useSyncStore } from '../stores/sync.store';

export function useSyncStatus() {
  const syncState = useSyncStore();

  // Subscribe to online/offline status
  useEffect(() => {
    const handleOnline = () => syncState.setOnline(true);
    const handleOffline = () => syncState.setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncState]);

  // Subscribe to sync events from main process
  useEffect(() => {
    const cleanupComplete = window.electronAPI.sync.onComplete(() => {
      syncState.setSyncing(false);
      syncState.setLastSync(new Date());
    });

    const cleanupError = window.electronAPI.sync.onError((error: Error) => {
      console.error('Sync error:', error);
      syncState.setSyncing(false);
    });

    const cleanupStatus = window.electronAPI.sync.onStatusChanged((status) => {
      syncState.updateStatus({
        pendingCount: status.pendingCount,
        isSyncing: status.isSyncing,
        isOnline: status.isOnline,
        lastSyncAt: status.lastSyncAt ? new Date(status.lastSyncAt) : null,
      });
    });

    return () => {
      cleanupComplete();
      cleanupError();
      cleanupStatus();
    };
  }, [syncState]);

  // Sync commands
  const commands = {
    startSync: () => {
      syncState.setSyncing(true);
      window.electronAPI.sync.start();
    },
  };

  return {
    // State
    isOnline: syncState.isOnline,
    queueSize: syncState.queueSize,
    lastSyncAt: syncState.lastSyncAt,
    isSyncing: syncState.isSyncing,

    // Computed
    hasOfflineQueue: syncState.queueSize > 0,
    canSync: syncState.isOnline && !syncState.isSyncing,

    // Commands
    ...commands,
  };
}
