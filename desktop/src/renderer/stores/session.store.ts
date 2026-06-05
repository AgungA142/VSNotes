/**
 * Session Store (Zustand)
 * Mirrors XState session state from main process via IPC
 * 
 * This store is the renderer's view of the session state machine running in main process.
 * It subscribes to IPC events and updates accordingly.
 * Never mutate this state directly - send commands to main process instead.
 */

import { create } from 'zustand';
import type { SessionState } from '../../shared/types';

interface SessionStore extends SessionState {
  // Actions
  updateState: (state: Partial<SessionState>) => void;
  reset: () => void;
}

const initialState: SessionState = {
  status: 'idle',
  sessionId: null,
  videoTitle: null,
  sourceApp: null,
  sourceType: null,
  startedAt: null,
  durationSec: 0,
  error: null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  updateState: (state) => set((prev) => ({ ...prev, ...state })),

  reset: () => set(initialState),
}));
