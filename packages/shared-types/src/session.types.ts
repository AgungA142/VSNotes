/**
 * Session-related TypeScript interfaces shared across all apps
 */

export type SessionStatus = 'active' | 'completed' | 'dismissed';
export type SourceType = 'local' | 'streaming';

export interface Session {
  _id: string;
  userId: string;
  videoTitle: string;
  sourceApp: string;
  sourceType: SourceType;
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  status: SessionStatus;
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoDetectionInfo {
  windowTitle: string;
  appName: string;
  sourceType: SourceType;
  detectedAt: Date;
}

export interface TranscriptSegment {
  _id: string;
  sessionId: string;
  userId: string;
  timestampSec: number;
  text: string;
  language: string;
  createdAt: Date;
}

export interface AudioChunkEvent {
  type: 'chunk';
  sessionId: string;
  audioData: string; // base64 encoded WAV
  durationSec: number;
  capturedAt: string; // ISO timestamp
}

export interface AudioCommand {
  action: 'start' | 'stop' | 'pause' | 'resume';
  sessionId?: string;
}
