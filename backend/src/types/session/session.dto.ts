/**
 * Session DTOs
 * Data Transfer Objects for session endpoints
 */

export interface CreateSessionRequestDto {
  videoTitle: string;
  sourceApp: string;
  sourceType: 'local' | 'streaming';
  deviceId: string;
}

export interface CreateSessionResponseDto {
  sessionId: string;
  userId: string;
  videoTitle: string;
  sourceApp: string;
  sourceType: 'local' | 'streaming';
  startedAt: string;
  status: 'active' | 'completed' | 'dismissed';
  deviceId: string;
}

export interface UpdateSessionRequestDto {
  status?: 'active' | 'completed' | 'dismissed';
  endedAt?: string;
  durationSec?: number;
}

export interface SessionDto {
  sessionId: string;
  userId: string;
  videoTitle: string;
  sourceApp: string;
  sourceType: 'local' | 'streaming';
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  status: 'active' | 'completed' | 'dismissed';
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListDto {
  sessions: SessionDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadAudioChunkRequestDto {
  audioData: string; // base64 encoded WAV
  durationSec: number;
  capturedAt: string; // ISO timestamp
}

export interface UploadAudioChunkResponseDto {
  chunkId: string;
  sessionId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface TranscriptSegmentDto {
  segmentId: string;
  sessionId: string;
  timestampSec: number;
  text: string;
  language: string;
  createdAt: string;
}

export interface SessionTranscriptDto {
  sessionId: string;
  segments: TranscriptSegmentDto[];
  totalSegments: number;
}
