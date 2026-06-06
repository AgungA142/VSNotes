/**
 * Local SQLite cache — offline-first storage for sessions, notes, and pending operations.
 * Uses better-sqlite3 (synchronous) — safe to call from the Electron main process.
 *
 * Lifecycle: call initDatabase(dbPath) once during app startup, then use the
 * exported CRUD helpers anywhere in the main process.
 */

import Database from 'better-sqlite3';

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'pending' | 'synced' | 'failed';
export type OperationType = 'create' | 'update' | 'delete';
export type ResourceType = 'session' | 'note' | 'audio';

export interface CachedSession {
  id: number;
  sessionId: string | null;   // MongoDB ObjectId; null until synced
  videoTitle: string;
  sourceApp: string;
  startedAt: string;          // ISO timestamp
  endedAt: string | null;
  status: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CachedNote {
  id: number;
  noteId: string | null;      // MongoDB ObjectId; null until synced
  sessionId: string;
  timestampSec: number;
  text: string;
  type: 'auto' | 'manual';
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PendingOperation {
  id: number;
  operationType: OperationType;
  resourceType: ResourceType;
  resourceId: string;
  payload: string;            // JSON-serialised
  retryCount: number;
  lastAttempt: string | null; // ISO timestamp
  createdAt: string;
}

// ============================================================================
// Module-level db instance
// ============================================================================

let db: Database.Database | null = null;

export function initDatabase(dbPath: string): void {
  if (db) return; // already initialised

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');  // better concurrent read performance
  db.pragma('foreign_keys = ON');

  createSchema(db);
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}

function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised — call initDatabase() first');
  return db;
}

// ============================================================================
// Schema
// ============================================================================

function createSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions_cache (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId   TEXT UNIQUE,
      videoTitle  TEXT NOT NULL,
      sourceApp   TEXT NOT NULL,
      startedAt   TEXT NOT NULL,
      endedAt     TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      syncStatus  TEXT NOT NULL DEFAULT 'pending',
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_sessionId   ON sessions_cache(sessionId);
    CREATE INDEX IF NOT EXISTS idx_sessions_syncStatus  ON sessions_cache(syncStatus);

    CREATE TABLE IF NOT EXISTS notes_cache (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      noteId       TEXT UNIQUE,
      sessionId    TEXT NOT NULL,
      timestampSec REAL NOT NULL,
      text         TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'manual',
      syncStatus   TEXT NOT NULL DEFAULT 'pending',
      createdAt    TEXT NOT NULL,
      updatedAt    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_sessionId   ON notes_cache(sessionId);
    CREATE INDEX IF NOT EXISTS idx_notes_syncStatus  ON notes_cache(syncStatus);

    CREATE TABLE IF NOT EXISTS pending_operations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      operationType TEXT NOT NULL,
      resourceType  TEXT NOT NULL,
      resourceId    TEXT NOT NULL,
      payload       TEXT NOT NULL DEFAULT '{}',
      retryCount    INTEGER NOT NULL DEFAULT 0,
      lastAttempt   TEXT,
      createdAt     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pending_resourceId ON pending_operations(resourceId);

    CREATE TABLE IF NOT EXISTS user_settings_cache (
      key       TEXT PRIMARY KEY,
      value     TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}

// ============================================================================
// sessions_cache — CRUD
// ============================================================================

export function insertSession(
  data: Omit<CachedSession, 'id'>
): CachedSession {
  const stmt = getDb().prepare(`
    INSERT INTO sessions_cache
      (sessionId, videoTitle, sourceApp, startedAt, endedAt, status, syncStatus, createdAt, updatedAt)
    VALUES
      (@sessionId, @videoTitle, @sourceApp, @startedAt, @endedAt, @status, @syncStatus, @createdAt, @updatedAt)
  `);
  const result = stmt.run(data);
  return getSession(result.lastInsertRowid as number)!;
}

export function getSession(id: number): CachedSession | undefined {
  return getDb()
    .prepare('SELECT * FROM sessions_cache WHERE id = ?')
    .get(id) as CachedSession | undefined;
}

export function getSessionBySessionId(sessionId: string): CachedSession | undefined {
  return getDb()
    .prepare('SELECT * FROM sessions_cache WHERE sessionId = ?')
    .get(sessionId) as CachedSession | undefined;
}

export function getAllSessions(): CachedSession[] {
  return getDb()
    .prepare('SELECT * FROM sessions_cache ORDER BY createdAt DESC')
    .all() as CachedSession[];
}

export function getSessionsBySyncStatus(syncStatus: SyncStatus): CachedSession[] {
  return getDb()
    .prepare('SELECT * FROM sessions_cache WHERE syncStatus = ? ORDER BY createdAt ASC')
    .all(syncStatus) as CachedSession[];
}

export function updateSession(
  id: number,
  updates: Partial<Omit<CachedSession, 'id'>>
): void {
  const now = new Date().toISOString();
  const fields = { ...updates, updatedAt: now };
  const setClauses = Object.keys(fields)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  getDb()
    .prepare(`UPDATE sessions_cache SET ${setClauses} WHERE id = @id`)
    .run({ ...fields, id });
}

export function deleteSession(id: number): void {
  getDb().prepare('DELETE FROM sessions_cache WHERE id = ?').run(id);
}

export function deleteSessionBySessionId(sessionId: string): void {
  if (!db) return;
  db.prepare('DELETE FROM sessions_cache WHERE sessionId = ?').run(sessionId);
}

// ============================================================================
// notes_cache — CRUD
// ============================================================================

export function insertNote(data: Omit<CachedNote, 'id'>): CachedNote {
  const stmt = getDb().prepare(`
    INSERT INTO notes_cache
      (noteId, sessionId, timestampSec, text, type, syncStatus, createdAt, updatedAt)
    VALUES
      (@noteId, @sessionId, @timestampSec, @text, @type, @syncStatus, @createdAt, @updatedAt)
  `);
  const result = stmt.run(data);
  return getNote(result.lastInsertRowid as number)!;
}

export function getNote(id: number): CachedNote | undefined {
  return getDb()
    .prepare('SELECT * FROM notes_cache WHERE id = ?')
    .get(id) as CachedNote | undefined;
}

export function getNoteByNoteId(noteId: string): CachedNote | undefined {
  return getDb()
    .prepare('SELECT * FROM notes_cache WHERE noteId = ?')
    .get(noteId) as CachedNote | undefined;
}

export function getNotesBySession(sessionId: string): CachedNote[] {
  return getDb()
    .prepare('SELECT * FROM notes_cache WHERE sessionId = ? ORDER BY timestampSec ASC')
    .all(sessionId) as CachedNote[];
}

export function getNotesBySyncStatus(syncStatus: SyncStatus): CachedNote[] {
  return getDb()
    .prepare('SELECT * FROM notes_cache WHERE syncStatus = ? ORDER BY createdAt ASC')
    .all(syncStatus) as CachedNote[];
}

export function updateNote(
  id: number,
  updates: Partial<Omit<CachedNote, 'id'>>
): void {
  const now = new Date().toISOString();
  const fields = { ...updates, updatedAt: now };
  const setClauses = Object.keys(fields)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  getDb()
    .prepare(`UPDATE notes_cache SET ${setClauses} WHERE id = @id`)
    .run({ ...fields, id });
}

export function deleteNote(id: number): void {
  getDb().prepare('DELETE FROM notes_cache WHERE id = ?').run(id);
}

export function deleteNoteByNoteId(noteId: string): void {
  getDb().prepare('DELETE FROM notes_cache WHERE noteId = ?').run(noteId);
}

export function deleteNotesBySession(sessionId: string): void {
  getDb().prepare('DELETE FROM notes_cache WHERE sessionId = ?').run(sessionId);
}

// ============================================================================
// pending_operations — CRUD
// ============================================================================

export function insertOperation(
  data: Omit<PendingOperation, 'id'>
): PendingOperation {
  const stmt = getDb().prepare(`
    INSERT INTO pending_operations
      (operationType, resourceType, resourceId, payload, retryCount, lastAttempt, createdAt)
    VALUES
      (@operationType, @resourceType, @resourceId, @payload, @retryCount, @lastAttempt, @createdAt)
  `);
  const result = stmt.run(data);
  return getOperation(result.lastInsertRowid as number)!;
}

export function getOperation(id: number): PendingOperation | undefined {
  return getDb()
    .prepare('SELECT * FROM pending_operations WHERE id = ?')
    .get(id) as PendingOperation | undefined;
}

export function getAllPendingOperations(): PendingOperation[] {
  if (!db) return [];
  return db
    .prepare('SELECT * FROM pending_operations ORDER BY createdAt ASC')
    .all() as PendingOperation[];
}

export function getOperationsByResource(resourceId: string): PendingOperation[] {
  return getDb()
    .prepare('SELECT * FROM pending_operations WHERE resourceId = ? ORDER BY createdAt ASC')
    .all(resourceId) as PendingOperation[];
}

export function incrementRetryCount(id: number): void {
  getDb()
    .prepare(`
      UPDATE pending_operations
      SET retryCount = retryCount + 1, lastAttempt = ?
      WHERE id = ?
    `)
    .run(new Date().toISOString(), id);
}

export function deleteOperation(id: number): void {
  getDb().prepare('DELETE FROM pending_operations WHERE id = ?').run(id);
}

export function deleteOperationsByResource(resourceId: string): void {
  getDb().prepare('DELETE FROM pending_operations WHERE resourceId = ?').run(resourceId);
}

// ============================================================================
// user_settings_cache — key/value store for user settings (offline fallback)
// ============================================================================

export function setUserSettingCache(key: string, value: string): void {
  if (!db) return;
  db.prepare(
      `INSERT INTO user_settings_cache (key, value, updatedAt)
       VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @updatedAt`
    )
    .run({ key, value, updatedAt: new Date().toISOString() });
}

export function getUserSettingCache(key: string): string | null {
  if (!db) return null;
  const row = db
    .prepare('SELECT value FROM user_settings_cache WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
