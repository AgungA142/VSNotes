/**
 * XState Session State Machine
 * Mengelola lifecycle sesi rekaman: idle → recording → paused → processing → syncing → done
 *
 * Machine ini murni state + context. Side effects (IPC, API calls) ditangani
 * oleh SessionManager yang subscribe ke state changes.
 */

import { setup, assign } from 'xstate';
import type { VideoDetectionInfo } from '@shared/types';

// ============================================================================
// Context & Event Types
// ============================================================================

export interface SessionContext {
  sessionId: string | null;
  videoInfo: VideoDetectionInfo | null;
  startTime: string | null; // ISO string agar bisa diserialisasi ke electron-store
  chunkCount: number; // jumlah audio chunk yang sudah diupload
  error: string | null;
  hasTranscript: boolean;
  isOnline: boolean;
}

export type SessionMachineEvent =
  | { type: 'VIDEO_DETECTED'; videoInfo: VideoDetectionInfo }
  | { type: 'USER_CONFIRMED' }
  | { type: 'USER_DISMISSED' }
  | { type: 'AUDIO_CHUNK_READY'; audioData: string; durationSec: number; capturedAt: string }
  | { type: 'TRANSCRIPTION_DONE' }
  | { type: 'SESSION_END' }
  | { type: 'USER_PAUSED' }
  | { type: 'USER_RESUMED' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'ONLINE_STATUS_CHANGED'; isOnline: boolean }
  | { type: 'SET_SESSION_ID'; sessionId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialContext: SessionContext = {
  sessionId: null,
  videoInfo: null,
  startTime: null,
  chunkCount: 0,
  error: null,
  hasTranscript: false,
  isOnline: true,
};

// ============================================================================
// Machine Definition
// ============================================================================

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionMachineEvent,
  },

  guards: {
    // Hanya bisa konfirmasi jika videoInfo sudah tersimpan di context
    hasVideoInfo: ({ context }) => context.videoInfo !== null,
    // Gunakan syncing jika sedang online
    isOnline: ({ context }) => context.isOnline,
  },

  actions: {
    storeVideoInfo: assign({
      videoInfo: ({ event }) =>
        event.type === 'VIDEO_DETECTED' ? event.videoInfo : null,
    }),

    clearVideoInfo: assign({
      videoInfo: () => null,
    }),

    setStartTime: assign({
      startTime: () => new Date().toISOString(),
    }),

    incrementChunkCount: assign({
      chunkCount: ({ context }) => context.chunkCount + 1,
    }),

    markTranscriptDone: assign({
      hasTranscript: () => true,
    }),

    setSessionId: assign({
      sessionId: ({ event }) =>
        event.type === 'SET_SESSION_ID' ? event.sessionId : null,
    }),

    setError: assign({
      error: ({ event }) =>
        event.type === 'SET_ERROR' ? event.error : null,
    }),

    updateOnlineStatus: assign({
      isOnline: ({ event }) =>
        event.type === 'ONLINE_STATUS_CHANGED' ? event.isOnline : true,
    }),

    resetContext: assign(() => initialContext),
  },
}).createMachine({
  id: 'session',
  initial: 'idle',
  context: initialContext,

  states: {
    /**
     * Menunggu deteksi video.
     * VIDEO_DETECTED: simpan info video di context, renderer akan tampilkan popup.
     * USER_CONFIRMED: mulai sesi (guard: harus ada videoInfo).
     * USER_DISMISSED: bersihkan videoInfo, kembali menunggu.
     */
    idle: {
      on: {
        VIDEO_DETECTED: {
          actions: ['storeVideoInfo'],
        },
        USER_CONFIRMED: {
          guard: 'hasVideoInfo',
          target: 'recording',
          actions: ['setStartTime'],
        },
        USER_DISMISSED: {
          actions: ['clearVideoInfo'],
        },
        ONLINE_STATUS_CHANGED: {
          actions: ['updateOnlineStatus'],
        },
        RESET: {
          actions: ['resetContext'],
        },
      },
    },

    /**
     * Sesi aktif, audio sedang direkam dan diupload.
     * AUDIO_CHUNK_READY: SessionManager menangani upload; machine hanya tambah counter.
     * USER_PAUSED: jeda rekaman.
     * SESSION_END: selesaikan sesi, masuk ke processing.
     */
    recording: {
      on: {
        AUDIO_CHUNK_READY: {
          actions: ['incrementChunkCount'],
        },
        SET_SESSION_ID: {
          actions: ['setSessionId'],
        },
        USER_PAUSED: {
          target: 'paused',
        },
        SESSION_END: {
          target: 'processing',
        },
        ONLINE_STATUS_CHANGED: {
          actions: ['updateOnlineStatus'],
        },
        SET_ERROR: {
          actions: ['setError'],
        },
      },
    },

    /**
     * Sesi dijeda. Audio tidak direkam, tapi sesi masih aktif.
     * USER_RESUMED: lanjut rekam.
     * SESSION_END: selesaikan langsung dari state paused.
     */
    paused: {
      on: {
        USER_RESUMED: {
          target: 'recording',
        },
        SESSION_END: {
          target: 'processing',
        },
        ONLINE_STATUS_CHANGED: {
          actions: ['updateOnlineStatus'],
        },
      },
    },

    /**
     * Menunggu transkripsi selesai di backend.
     * SessionManager akan kirim TRANSCRIPTION_DONE setelah semua chunk terupload
     * dan backend selesai memproses.
     * Jika online → syncing; jika offline → done (sync nanti via sync-manager).
     */
    processing: {
      on: {
        TRANSCRIPTION_DONE: [
          {
            guard: 'isOnline',
            target: 'syncing',
            actions: ['markTranscriptDone'],
          },
          {
            target: 'done',
            actions: ['markTranscriptDone'],
          },
        ],
        ONLINE_STATUS_CHANGED: {
          actions: ['updateOnlineStatus'],
        },
        SET_ERROR: {
          actions: ['setError'],
        },
      },
    },

    /**
     * Sinkronisasi data sesi ke cloud (update status session ke 'completed').
     * SessionManager kirim SYNC_COMPLETE setelah backend berhasil di-update.
     */
    syncing: {
      on: {
        SYNC_COMPLETE: {
          target: 'done',
        },
        ONLINE_STATUS_CHANGED: {
          actions: ['updateOnlineStatus'],
        },
        SET_ERROR: {
          actions: ['setError'],
        },
      },
    },

    /**
     * Sesi selesai. User bisa memulai sesi baru.
     * RESET: kembali ke idle, bersihkan semua context.
     * VIDEO_DETECTED: deteksi video baru langsung reset dan tanya konfirmasi ulang.
     */
    done: {
      on: {
        RESET: {
          target: 'idle',
          actions: ['resetContext'],
        },
        VIDEO_DETECTED: {
          target: 'idle',
          actions: ['resetContext', 'storeVideoInfo'],
        },
      },
    },
  },
});

export type SessionMachine = typeof sessionMachine;
