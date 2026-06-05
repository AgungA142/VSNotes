/**
 * Note DTOs
 * Data Transfer Objects for note endpoints
 */

export interface CreateNoteRequestDto {
  timestampSec: number;
  text: string;
  type?: 'auto' | 'manual';
}

export interface CreateNoteResponseDto {
  noteId: string;
  sessionId: string;
  userId: string;
  timestampSec: number;
  text: string;
  type: 'auto' | 'manual';
  createdAt: string;
}

export interface UpdateNoteRequestDto {
  text?: string;
  timestampSec?: number;
}

export interface NoteDto {
  noteId: string;
  sessionId: string;
  userId: string;
  timestampSec: number;
  text: string;
  type: 'auto' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface NoteListDto {
  sessionId: string;
  notes: NoteDto[];
  total: number;
}
