import React, { useEffect, useRef, useState, useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { useNoteShortcut } from '../hooks/useNoteShortcut';
import { useSessionStore } from '../stores/session.store';
import type { Note } from '@vsnotes/shared-types';

const MAX_NOTE_LENGTH = 500;
const NOTE_ROW_HEIGHT = 80;
const NOTE_ROW_EDIT_HEIGHT = 148;
const NOTE_ROW_DELETE_HEIGHT = 100;
const VIRTUALIZE_THRESHOLD = 100;

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// Toast
// ============================================================================

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {message}
    </div>
  );
}

// ============================================================================
// AddNoteForm
// ============================================================================

interface AddNoteFormProps {
  sessionId: string;
  currentTimestampSec: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AddNoteForm({ sessionId, currentTimestampSec, onClose, onSuccess }: AddNoteFormProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: createNote, isPending } = useCreateNote();

  useEffect(() => { textareaRef.current?.focus(); }, []);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_NOTE_LENGTH) setText(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') onClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    createNote(
      { sessionId, data: { sessionId, text: trimmed, timestampSec: currentTimestampSec, type: 'manual' } },
      { onSuccess: () => { onSuccess(); onClose(); } }
    );
  }

  const remaining = MAX_NOTE_LENGTH - text.length;
  const canSubmit = text.trim().length > 0 && remaining >= 0 && !isPending;

  return (
    <div className="border-b border-gray-100 bg-gray-50 px-3 py-3 flex-shrink-0">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        placeholder="Tulis catatan... (Ctrl+Enter simpan, Esc batal)"
        rows={2}
        className="w-full resize-none text-sm text-gray-800 bg-white border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 disabled:opacity-60 overflow-hidden"
        style={{ minHeight: '60px' }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs ${remaining < 50 ? 'text-red-500' : 'text-gray-400'}`}>
          {remaining} karakter tersisa
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={isPending} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NoteItem â€” single note with inline edit / delete confirm
// ============================================================================

interface NoteItemCallbacks {
  onEditStart: (id: string) => void;
  onEditCancel: () => void;
  onEditSave: (id: string, text: string) => void;
  onDeleteStart: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (id: string) => void;
}

interface NoteItemProps extends NoteItemCallbacks {
  note: Note;
  isEditing: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  isRemoving: boolean;
  readOnly?: boolean;
}

function NoteItem({ note, isEditing, isDeleting, isSaving, isRemoving, readOnly, onEditStart, onEditCancel, onEditSave, onDeleteStart, onDeleteCancel, onDeleteConfirm }: NoteItemProps) {
  const [editText, setEditText] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isManual = note.type === 'manual';

  // Sync editText when note changes from outside
  useEffect(() => { setEditText(note.text); }, [note.text]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  function handleEditInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') onEditCancel();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
  }

  function handleSave() {
    const trimmed = editText.trim();
    if (!trimmed || isSaving) return;
    onEditSave(note._id, trimmed);
  }

  // â”€â”€ Delete confirm mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isDeleting) {
    return (
      <div className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200 transition-colors">
        <span className="flex-shrink-0 font-mono text-xs text-gray-400 mt-0.5 w-14 text-right">
          {formatTimestamp(note.timestampSec)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-700 mb-1">Yakin ingin menghapus catatan ini?</p>
          <p className="text-xs text-gray-500 truncate">{note.text}</p>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onDeleteConfirm(note._id)}
            disabled={isRemoving}
            className="px-2.5 py-1 text-[11px] font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isRemoving ? 'Menghapus...' : 'Hapus'}
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            disabled={isRemoving}
            className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  // â”€â”€ Edit mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isEditing) {
    const canSave = editText.trim().length > 0 && editText.trim() !== note.text && !isSaving;
    return (
      <div className="flex gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 transition-colors">
        <span className="flex-shrink-0 font-mono text-xs text-gray-400 mt-1 w-14 text-right">
          {formatTimestamp(note.timestampSec)}
        </span>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onInput={handleEditInput}
            onKeyDown={handleEditKeyDown}
            disabled={isSaving}
            rows={2}
            className="w-full resize-none text-sm text-gray-800 bg-white border border-indigo-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 overflow-hidden"
          />
          <div className="flex gap-2 mt-1.5">
            <button type="button" onClick={handleSave} disabled={!canSave} className="px-2.5 py-1 text-[11px] font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={onEditCancel} disabled={isSaving} className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ Normal mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="group flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
      <span className="flex-shrink-0 font-mono text-xs text-gray-400 mt-0.5 w-14 text-right">
        {formatTimestamp(note.timestampSec)}
      </span>
      <p className="flex-1 text-sm text-gray-800 leading-snug min-w-0">
        {note.text}
      </p>
      <div className="flex items-start gap-1 flex-shrink-0">
        <span className={[
          'self-start px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
          isManual ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700',
        ].join(' ')}>
          {isManual ? 'Manual' : 'Auto'}
        </span>
        {!readOnly && isManual && (
          <>
            <button
              type="button"
              onClick={() => onEditStart(note._id)}
              title="Edit catatan"
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDeleteStart(note._id)}
              title="Hapus catatan"
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// NoteRow â€” react-window v2 (virtualized list)
// ============================================================================

interface NoteRowData extends NoteItemCallbacks {
  items: Note[];
  editingNoteId: string | null;
  deletingNoteId: string | null;
  isSaving: boolean;
  isRemoving: boolean;
  readOnly?: boolean;
}

function NoteRow({ index, style, items, editingNoteId, deletingNoteId, isSaving, isRemoving, readOnly, onEditStart, onEditCancel, onEditSave, onDeleteStart, onDeleteCancel, onDeleteConfirm }: RowComponentProps<NoteRowData>) {
  const note = items[index];
  return (
    <div style={style} className="px-3 py-1">
      <NoteItem
        note={note}
        isEditing={editingNoteId === note._id}
        isDeleting={deletingNoteId === note._id}
        isSaving={isSaving}
        isRemoving={isRemoving}
        readOnly={readOnly}
        onEditStart={onEditStart}
        onEditCancel={onEditCancel}
        onEditSave={onEditSave}
        onDeleteStart={onDeleteStart}
        onDeleteCancel={onDeleteCancel}
        onDeleteConfirm={onDeleteConfirm}
      />
    </div>
  );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function NotesSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="w-14 h-3 rounded bg-gray-200 animate-pulse mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 rounded bg-gray-200 animate-pulse w-3/4" />
          </div>
          <div className="w-10 h-4 rounded bg-gray-200 animate-pulse flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty state
// ============================================================================

function NotesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center">
      <svg className="w-12 h-12 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <p className="text-sm font-medium">Belum ada catatan</p>
      <p className="text-xs mt-1 text-gray-300">Catatan otomatis akan muncul saat sesi berjalan</p>
    </div>
  );
}

// ============================================================================
// NotesList
// ============================================================================

interface NotesListProps extends NoteItemCallbacks {
  notes: Note[];
  editingNoteId: string | null;
  deletingNoteId: string | null;
  isSaving: boolean;
  isRemoving: boolean;
  readOnly?: boolean;
}

function NotesList({ notes, editingNoteId, deletingNoteId, isSaving, isRemoving, readOnly, ...callbacks }: NotesListProps) {
  const sorted = [...notes].sort((a, b) => a.timestampSec - b.timestampSec);

  if (sorted.length === 0) return <NotesEmpty />;

  if (sorted.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div className="flex flex-col gap-1 px-3 py-2 overflow-y-auto h-full">
        {sorted.map((note) => (
          <NoteItem
            key={note._id}
            note={note}
            isEditing={editingNoteId === note._id}
            isDeleting={deletingNoteId === note._id}
            isSaving={isSaving}
            isRemoving={isRemoving}
            readOnly={readOnly}
            {...callbacks}
          />
        ))}
      </div>
    );
  }

  const rowProps: NoteRowData = {
    items: sorted,
    editingNoteId,
    deletingNoteId,
    isSaving,
    isRemoving,
    readOnly,
    ...callbacks,
  };

  return (
    <List
      rowComponent={NoteRow}
      rowProps={rowProps}
      rowCount={sorted.length}
      rowHeight={(index, { items, editingNoteId: eid, deletingNoteId: did }) => {
        const note = items[index];
        if (note._id === eid) return NOTE_ROW_EDIT_HEIGHT;
        if (note._id === did) return NOTE_ROW_DELETE_HEIGHT;
        return NOTE_ROW_HEIGHT;
      }}
      style={{ height: '100%', width: '100%' }}
      overscanCount={5}
    />
  );
}

// ============================================================================
// NotesPanel
// ============================================================================

interface NotesPanelProps {
  sessionId?: string;
  readOnly?: boolean;
}

export function NotesPanel({ sessionId: propSessionId, readOnly = false }: NotesPanelProps) {
  const { sessionId: storeSessionId, status, durationSec } = useSessionStore();
  const sessionId = propSessionId ?? storeSessionId;
  const isSessionActive = !readOnly && (status === 'recording' || status === 'paused' || status === 'processing');
  const notesEnabled = readOnly ? !!sessionId : isSessionActive;

  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: notes, isLoading, isError } = useNotes(sessionId, notesEnabled);
  const { mutate: updateNote, isPending: isSaving } = useUpdateNote();
  const { mutate: deleteNote, isPending: isRemoving } = useDeleteNote();

  const openForm = useCallback(() => setShowForm(true), []);
  const closeForm = useCallback(() => setShowForm(false), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const handleAddSuccess = useCallback(() => setToast('Catatan berhasil ditambahkan'), []);

  const handleEditStart = useCallback((id: string) => {
    setEditingNoteId(id);
    setDeletingNoteId(null);
  }, []);

  const handleEditCancel = useCallback(() => setEditingNoteId(null), []);

  const handleEditSave = useCallback((id: string, text: string) => {
    updateNote(
      { id, data: { text } },
      {
        onSuccess: () => setToast('Catatan berhasil diperbarui'),
        onSettled: () => setEditingNoteId(null),
      }
    );
  }, [updateNote]);

  const handleDeleteStart = useCallback((id: string) => {
    setDeletingNoteId(id);
    setEditingNoteId(null);
  }, []);

  const handleDeleteCancel = useCallback(() => setDeletingNoteId(null), []);

  const handleDeleteConfirm = useCallback((id: string) => {
    deleteNote(id, {
      onSuccess: () => setToast('Catatan berhasil dihapus'),
      onSettled: () => setDeletingNoteId(null),
    });
  }, [deleteNote]);

  const handleCopyAll = useCallback(() => {
    if (!notes || notes.length === 0) return;

    const sorted = [...notes].sort((a, b) => a.timestampSec - b.timestampSec);
    const autoNotes = sorted.filter((n) => n.type === 'auto');
    const manualNotes = sorted.filter((n) => n.type === 'manual');

    const lines: string[] = ['CATATAN', ''];
    if (autoNotes.length > 0) {
      lines.push('[Otomatis]');
      for (const note of autoNotes) lines.push(`[${formatTimestamp(note.timestampSec)}] ${note.text}`);
      lines.push('');
    }
    if (manualNotes.length > 0) {
      lines.push('[Manual]');
      for (const note of manualNotes) lines.push(`[${formatTimestamp(note.timestampSec)}] ${note.text}`);
    }

    const text = lines.join('\n').trimEnd();

    const doWrite = window.electronAPI?.clipboard?.write
      ? () => window.electronAPI.clipboard.write(text)
      : () => navigator.clipboard.writeText(text);

    doWrite()
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => setToast('Gagal menyalin'));
  }, [notes]);

  useNoteShortcut(openForm, isSessionActive);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Catatan</h2>
          {notes && notes.length > 0 && (
            <span className="text-xs text-gray-400">{notes.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Salin Semua â€” tersedia di semua mode jika ada catatan */}
          {notes && notes.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              title="Salin semua catatan"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Tersalin!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Salin Semua
                </>
              )}
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={openForm}
              disabled={!isSessionActive || showForm}
              title={!isSessionActive ? 'Mulai sesi untuk menambah catatan' : 'Tambah catatan (Ctrl+Shift+N)'}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Catatan
            </button>
          )}
        </div>
      </div>

      {/* Inline add form */}
      {!readOnly && showForm && sessionId && (
        <AddNoteForm
          sessionId={sessionId}
          currentTimestampSec={durationSec}
          onClose={closeForm}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Note list */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <NotesSkeleton />
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-sm text-red-500">
            Gagal memuat catatan
          </div>
        ) : (
          <NotesList
            notes={notes ?? []}
            editingNoteId={editingNoteId}
            deletingNoteId={deletingNoteId}
            isSaving={isSaving}
            isRemoving={isRemoving}
            readOnly={readOnly}
            onEditStart={handleEditStart}
            onEditCancel={handleEditCancel}
            onEditSave={handleEditSave}
            onDeleteStart={handleDeleteStart}
            onDeleteCancel={handleDeleteCancel}
            onDeleteConfirm={handleDeleteConfirm}
          />
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </div>
  );
}
