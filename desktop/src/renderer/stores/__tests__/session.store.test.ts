/**
 * Session Store Tests
 * Tests for Zustand session store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../session.store';
import type { SessionState } from '../../../shared/types';

describe('Session Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useSessionStore.getState().reset();
  });

  it('should have initial idle state', () => {
    const state = useSessionStore.getState();
    
    expect(state.status).toBe('idle');
    expect(state.sessionId).toBeNull();
    expect(state.videoTitle).toBeNull();
    expect(state.sourceApp).toBeNull();
    expect(state.sourceType).toBeNull();
    expect(state.startedAt).toBeNull();
    expect(state.durationSec).toBe(0);
    expect(state.error).toBeNull();
  });

  it('should update state partially', () => {
    const { updateState } = useSessionStore.getState();
    
    updateState({
      status: 'recording',
      sessionId: 'test-session-123',
      videoTitle: 'Test Video',
    });

    const state = useSessionStore.getState();
    expect(state.status).toBe('recording');
    expect(state.sessionId).toBe('test-session-123');
    expect(state.videoTitle).toBe('Test Video');
    // Other fields should remain unchanged
    expect(state.durationSec).toBe(0);
  });

  it('should update state multiple times', () => {
    const { updateState } = useSessionStore.getState();
    
    updateState({ status: 'recording', sessionId: 'session-1' });
    expect(useSessionStore.getState().status).toBe('recording');
    
    updateState({ status: 'paused' });
    expect(useSessionStore.getState().status).toBe('paused');
    expect(useSessionStore.getState().sessionId).toBe('session-1'); // Should persist
    
    updateState({ status: 'completed' });
    expect(useSessionStore.getState().status).toBe('completed');
  });

  it('should reset to initial state', () => {
    const { updateState, reset } = useSessionStore.getState();
    
    // Set some state
    updateState({
      status: 'recording',
      sessionId: 'test-session',
      videoTitle: 'Test Video',
      sourceApp: 'Chrome',
      sourceType: 'streaming',
      startedAt: new Date(),
      durationSec: 120,
    });

    // Verify state is set
    expect(useSessionStore.getState().status).toBe('recording');
    expect(useSessionStore.getState().sessionId).toBe('test-session');

    // Reset
    reset();

    // Verify state is reset
    const state = useSessionStore.getState();
    expect(state.status).toBe('idle');
    expect(state.sessionId).toBeNull();
    expect(state.videoTitle).toBeNull();
    expect(state.sourceApp).toBeNull();
    expect(state.sourceType).toBeNull();
    expect(state.startedAt).toBeNull();
    expect(state.durationSec).toBe(0);
    expect(state.error).toBeNull();
  });

  it('should handle error state', () => {
    const { updateState } = useSessionStore.getState();
    
    updateState({
      status: 'idle',
      error: 'Failed to start session',
    });

    const state = useSessionStore.getState();
    expect(state.error).toBe('Failed to start session');
  });

  it('should handle all session statuses', () => {
    const { updateState } = useSessionStore.getState();
    const statuses: SessionState['status'][] = [
      'idle',
      'recording',
      'paused',
      'processing',
      'syncing',
      'completed',
      'dismissed',
    ];

    statuses.forEach((status) => {
      updateState({ status });
      expect(useSessionStore.getState().status).toBe(status);
    });
  });
});
