/**
 * Sync Store Tests
 * Tests for Zustand sync store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from '../sync.store';

describe('Sync Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useSyncStore.getState();
    store.updateStatus({
      isOnline: true,
      queueSize: 0,
      lastSyncAt: null,
      isSyncing: false,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSyncStore.getState();
      
      expect(state.isOnline).toBe(true);
      expect(state.queueSize).toBe(0);
      expect(state.lastSyncAt).toBeNull();
      expect(state.isSyncing).toBe(false);
    });
  });

  describe('Online Status', () => {
    it('should update online status', () => {
      const { setOnline } = useSyncStore.getState();
      
      setOnline(false);
      expect(useSyncStore.getState().isOnline).toBe(false);
      
      setOnline(true);
      expect(useSyncStore.getState().isOnline).toBe(true);
    });
  });

  describe('Syncing Status', () => {
    it('should update syncing status', () => {
      const { setSyncing } = useSyncStore.getState();
      
      setSyncing(true);
      expect(useSyncStore.getState().isSyncing).toBe(true);
      
      setSyncing(false);
      expect(useSyncStore.getState().isSyncing).toBe(false);
    });
  });

  describe('Queue Size', () => {
    it('should update queue size', () => {
      const { updateQueue } = useSyncStore.getState();
      
      updateQueue(5);
      expect(useSyncStore.getState().queueSize).toBe(5);
      
      updateQueue(0);
      expect(useSyncStore.getState().queueSize).toBe(0);
      
      updateQueue(10);
      expect(useSyncStore.getState().queueSize).toBe(10);
    });
  });

  describe('Last Sync Timestamp', () => {
    it('should update last sync timestamp', () => {
      const { setLastSync } = useSyncStore.getState();
      const now = new Date();
      
      setLastSync(now);
      expect(useSyncStore.getState().lastSyncAt).toEqual(now);
    });

    it('should handle null last sync timestamp', () => {
      const { setLastSync } = useSyncStore.getState();
      
      setLastSync(new Date());
      expect(useSyncStore.getState().lastSyncAt).not.toBeNull();
      
      // Reset to null
      useSyncStore.getState().updateStatus({ lastSyncAt: null });
      expect(useSyncStore.getState().lastSyncAt).toBeNull();
    });
  });

  describe('Update Status', () => {
    it('should update multiple fields at once', () => {
      const { updateStatus } = useSyncStore.getState();
      const now = new Date();
      
      updateStatus({
        isOnline: false,
        queueSize: 3,
        isSyncing: true,
        lastSyncAt: now,
      });

      const state = useSyncStore.getState();
      expect(state.isOnline).toBe(false);
      expect(state.queueSize).toBe(3);
      expect(state.isSyncing).toBe(true);
      expect(state.lastSyncAt).toEqual(now);
    });

    it('should update partial fields', () => {
      const { updateStatus } = useSyncStore.getState();
      
      updateStatus({ queueSize: 5 });
      expect(useSyncStore.getState().queueSize).toBe(5);
      expect(useSyncStore.getState().isOnline).toBe(true); // Should remain unchanged
      
      updateStatus({ isOnline: false });
      expect(useSyncStore.getState().isOnline).toBe(false);
      expect(useSyncStore.getState().queueSize).toBe(5); // Should remain unchanged
    });
  });

  describe('Sync Workflow', () => {
    it('should handle complete sync workflow', () => {
      const { setSyncing, updateQueue, setLastSync } = useSyncStore.getState();
      
      // Start with offline queue
      updateQueue(5);
      expect(useSyncStore.getState().queueSize).toBe(5);
      
      // Start syncing
      setSyncing(true);
      expect(useSyncStore.getState().isSyncing).toBe(true);
      
      // Complete sync
      setSyncing(false);
      updateQueue(0);
      setLastSync(new Date());
      
      const state = useSyncStore.getState();
      expect(state.isSyncing).toBe(false);
      expect(state.queueSize).toBe(0);
      expect(state.lastSyncAt).not.toBeNull();
    });

    it('should handle offline to online transition', () => {
      const { setOnline, updateQueue } = useSyncStore.getState();
      
      // Go offline with pending operations
      setOnline(false);
      updateQueue(3);
      
      expect(useSyncStore.getState().isOnline).toBe(false);
      expect(useSyncStore.getState().queueSize).toBe(3);
      
      // Come back online
      setOnline(true);
      
      expect(useSyncStore.getState().isOnline).toBe(true);
      expect(useSyncStore.getState().queueSize).toBe(3); // Queue should still exist
    });
  });
});
