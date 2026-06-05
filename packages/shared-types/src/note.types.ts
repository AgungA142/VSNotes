/**
 * Note-related TypeScript interfaces shared across all apps
 */

export type NoteType = 'auto' | 'manual';
export type LengthPreference = 'short' | 'medium' | 'long';

export interface Note {
  _id: string;
  sessionId: string;
  userId: string;
  timestampSec: number;
  text: string;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Summary {
  _id: string;
  sessionId: string;
  userId: string;
  content: string;
  keyPoints: string[];
  lengthPref: LengthPreference;
  createdAt: Date;
}

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  settings: UserSettings;
  createdAt: Date;
}

export interface UserSettings {
  summaryLengthPref: LengthPreference;
  autoStartSession: boolean;
  notificationsEnabled: boolean;
  watchPlatforms: string[];
}

export type ExportFormat = 'pdf' | 'md' | 'txt';

export interface ExportOptions {
  sessionId: string;
  format: ExportFormat;
  includeTranscript?: boolean;
}
