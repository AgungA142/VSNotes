/**
 * TypeScript interfaces for IPC payloads
 * Shared between main, preload, and renderer processes
 */

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'syncing' | 'completed' | 'dismissed';

export interface SessionState {
  status: SessionStatus;
  sessionId: string | null;
  videoTitle: string | null;
  sourceApp: string | null;
  sourceType: 'local' | 'streaming' | null;
  startedAt: Date | null;
  durationSec: number;
  error: string | null;
}

// ============================================================================
// Video Detection Types
// ============================================================================

export interface VideoDetectionInfo {
  windowTitle: string;
  appName: string;
  sourceType: 'local' | 'streaming';
  detectedAt: Date;
}

export type ConfirmationResult = 'confirmed' | 'dismissed' | 'timeout';

// ============================================================================
// Audio Capture Types
// ============================================================================

export interface AudioCommand {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'list_devices' | 'audio_sessions';
  sessionId?: string;
  deviceIndex?: number; // preferred WASAPI output device for loopback
}

export interface AudioSessionsEvent {
  type: 'audio_sessions';
  processes: string[]; // process names currently outputting audio, e.g. ['chrome.exe', 'vlc.exe']
}

export interface AudioOutputDevice {
  index: number;
  name: string;
}

export interface AudioChunkEvent {
  type: 'chunk';
  sessionId: string;
  audioData: string; // base64 encoded WAV
  durationSec: number;
  capturedAt: string; // ISO timestamp
}

export interface AudioErrorEvent {
  type: 'error';
  sessionId: string;
  error: string;
  timestamp: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

// ============================================================================
// Note Types
// ============================================================================

export type NoteType = 'auto' | 'manual';

export interface Note {
  id: string;
  sessionId: string;
  timestampSec: number;
  text: string;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotePayload {
  sessionId: string;
  timestampSec: number;
  text: string;
  type: NoteType;
}

export interface UpdateNotePayload {
  text: string;
}

// ============================================================================
// Transcript Types
// ============================================================================

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  timestampSec: number;
  text: string;
  language: string;
  createdAt: Date;
}

// ============================================================================
// Summary Types
// ============================================================================

export type SummaryLength = 'short' | 'medium' | 'long';

export interface Summary {
  id: string;
  sessionId: string;
  content: string;
  keyPoints: string[];
  lengthPref: SummaryLength;
  createdAt: Date;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncStatus {
  isOnline: boolean;
  queueSize: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
}

export interface PendingOperation {
  id: string;
  type: 'session' | 'note' | 'audio';
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: Date;
  retryCount: number;
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionType = 'screen' | 'audio' | 'microphone';
export type PermissionStatus = 'granted' | 'denied' | 'not-determined';

export interface PermissionRequest {
  type: PermissionType;
}

export interface PermissionResponse {
  type: PermissionType;
  status: PermissionStatus;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'pdf' | 'markdown' | 'txt';

export interface ExportRequest {
  sessionId: string;
  format: ExportFormat;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ============================================================================
// Store Types (electron-store)
// ============================================================================

export interface AppSettings {
  summaryLengthPref: SummaryLength;
  autoStartSession: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface StoreSchema {
  // Encrypted field
  geminiApiKey?: string;

  // User settings
  settings: AppSettings;

  // Auth
  authToken?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;

  // Permissions
  permissions: {
    screen: PermissionStatus;
    audio: PermissionStatus;
  };
  
  // Last sync timestamp
  lastSyncAt?: string;

  // XState session machine persisted snapshot (JSON string)
  sessionSnapshot?: string;

  // Preferred WASAPI output device index for audio loopback capture
  audioDeviceIndex?: number;
}
