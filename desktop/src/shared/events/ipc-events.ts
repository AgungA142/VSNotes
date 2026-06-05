/**
 * IPC event name constants
 * Never use magic strings for IPC communication
 */

// Session events
export const SESSION_START = 'session:start';
export const SESSION_PAUSE = 'session:pause';
export const SESSION_RESUME = 'session:resume';
export const SESSION_END = 'session:end';
export const SESSION_DISMISS = 'session:dismiss';
export const SESSION_STATE_CHANGED = 'session:state-changed';

// Screen monitor events
export const SCREEN_MONITOR_START = 'screen-monitor:start';
export const SCREEN_MONITOR_STOP = 'screen-monitor:stop';
export const VIDEO_DETECTED = 'video:detected';
export const VIDEO_STOPPED = 'video:stopped';

// Audio capture events
export const AUDIO_CAPTURE_START = 'audio:start';
export const AUDIO_CAPTURE_STOP = 'audio:stop';
export const AUDIO_CHUNK_READY = 'audio:chunk-ready';
export const AUDIO_CHUNK_UPLOADED = 'audio:chunk-uploaded';
export const AUDIO_DEVICES_LIST = 'audio:devices-list';
export const AUDIO_DEVICE_SET = 'audio:device-set';

// Note events
export const NOTE_CREATE = 'note:create';
export const NOTE_UPDATE = 'note:update';
export const NOTE_DELETE = 'note:delete';
export const NOTE_SHORTCUT_TRIGGERED = 'note:shortcut-triggered';

// Sync events
export const SYNC_START = 'sync:start';
export const SYNC_COMPLETE = 'sync:complete';
export const SYNC_ERROR = 'sync:error';
export const SYNC_STATUS_CHANGED = 'sync:status-changed';

// Permission events
export const PERMISSION_REQUEST = 'permission:request';
export const PERMISSION_GRANTED = 'permission:granted';
export const PERMISSION_DENIED = 'permission:denied';
export const PERMISSIONS_CHANGED = 'permissions:changed';

// Auth commands (renderer → main via invoke)
export const AUTH_LOGIN = 'auth:login';
export const AUTH_REGISTER = 'auth:register';
export const AUTH_LOGOUT = 'auth:logout';
export const AUTH_CHECK = 'auth:check';
export const AUTH_FORGOT_PASSWORD = 'auth:forgot-password'; // renderer → main (invoke)

// Auth events (main → renderer via send)
export const AUTH_SESSION_EXPIRED = 'auth:session-expired';
export const AUTH_TOKEN_REFRESHED = 'auth:token-refreshed';
export const AUTH_LOGGED_OUT = 'auth:logged-out';

// App lifecycle events
export const APP_READY = 'app:ready';

// Offline auth event — token expired while network is unavailable
export const AUTH_OFFLINE_EXPIRED = 'auth:offline-expired';

// Clipboard — write text via Electron clipboard API
export const CLIPBOARD_WRITE = 'clipboard:write'; // renderer → main (invoke)

// Export — save file via Electron dialog
export const EXPORT_SAVE = 'export:save'; // renderer → main (invoke)

// Session cache cleanup (renderer → main: clean SQLite after backend delete)
export const SESSION_DELETE_CACHE = 'session:delete-cache';

// User settings events
export const SETTINGS_PLATFORMS_UPDATE = 'settings:platforms-update'; // renderer → main: update watchPlatforms
export const SETTINGS_PLATFORMS_UPDATED = 'settings:platforms-updated'; // main → renderer: confirmed update
