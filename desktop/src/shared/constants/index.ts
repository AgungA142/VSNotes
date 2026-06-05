/**
 * Application-wide constants
 */

export const APP_NAME = 'Video Summary & Auto-Notes';
export const APP_VERSION = '1.0.0';

// Screen monitoring
export const SCREEN_POLL_INTERVAL_IDLE = 3000; // 3 seconds
export const SCREEN_POLL_INTERVAL_ACTIVE = 10000; // 10 seconds

// Audio capture
export const AUDIO_CHUNK_SIZE_SEC = 30;
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_FORMAT = 'wav';

// Popup confirmation
export const POPUP_AUTO_DISMISS_MS = 15000; // 15 seconds

// Sync
export const SYNC_RETRY_ATTEMPTS = 3;
export const SYNC_RETRY_DELAY_MS = 1000;

// API
export const API_BASE_URL =
  process.env.API_BASE_URL || 'http://localhost:3000';
