/**
 * useSession Hook
 * Subscribes to IPC session:state-changed events and updates Zustand store
 * Provides session commands and state
 * 
 * This hook combines IPC subscription with Zustand state management.
 * It's the primary interface for components to interact with session state.
 */

import { useEffect } from 'react';
import { useSessionStore } from '../stores/session.store';
import type { SessionState } from '../../shared/types';

export function useSession() {
  const sessionState = useSessionStore();

  // Subscribe to IPC session state changes — mount once, clean up on unmount
  useEffect(() => {
    const cleanup = window.electronAPI.session.onStateChanged((state: SessionState) => {
      useSessionStore.getState().updateState(state);
    });
    return cleanup;
  }, []);

  // Session commands (send to main process)
  const commands = {
    start: () => window.electronAPI.session.start(),
    pause: () => window.electronAPI.session.pause(),
    resume: () => window.electronAPI.session.resume(),
    end: () => window.electronAPI.session.end(),
  };

  return {
    // State
    status: sessionState.status,
    sessionId: sessionState.sessionId,
    videoTitle: sessionState.videoTitle,
    sourceApp: sessionState.sourceApp,
    sourceType: sessionState.sourceType,
    startedAt: sessionState.startedAt,
    durationSec: sessionState.durationSec,
    error: sessionState.error,

    // Computed
    isIdle: sessionState.status === 'idle',
    isRecording: sessionState.status === 'recording',
    isPaused: sessionState.status === 'paused',
    isProcessing: sessionState.status === 'processing',
    isSyncing: sessionState.status === 'syncing',
    isCompleted: sessionState.status === 'completed',
    isDismissed: sessionState.status === 'dismissed',
    isActive: sessionState.status === 'recording' || sessionState.status === 'paused',

    // Commands
    ...commands,

    // Reset (for cleanup)
    reset: sessionState.reset,
  };
}
