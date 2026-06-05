import { Note } from '@models/Note';
import { Session } from '@models/Session';
import { AppError } from '@middleware/error-handler';
import type { CreateNoteInput, UpdateNoteInput, NoteQueryInput } from '@utils/validation/notes/notes.validation';
import type { NoteDto, CreateNoteResponseDto, NoteListDto } from '../../../types/note/note.dto';

// ============================================================================
// Mapper
// ============================================================================

function toNoteDto(note: InstanceType<typeof Note>): NoteDto {
  const n = note.toObject();
  return {
    noteId: String(n._id),
    sessionId: String(n.sessionId),
    userId: String(n.userId),
    timestampSec: n.timestampSec,
    text: n.text,
    type: n.type,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

// ============================================================================
// List notes
// ============================================================================

export async function listNotes(
  sessionId: string,
  userId: string,
  query: NoteQueryInput
): Promise<NoteListDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  const filter: Record<string, unknown> = { sessionId, userId };
  if (query.type) {
    filter.type = query.type;
  }

  const notes = await Note.find(filter).sort({ timestampSec: 1 });

  return {
    sessionId,
    notes: notes.map(toNoteDto),
    total: notes.length,
  };
}

// ============================================================================
// Create note (manual only)
// ============================================================================

export async function createNote(
  sessionId: string,
  userId: string,
  input: CreateNoteInput
): Promise<CreateNoteResponseDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  const note = await Note.create({
    sessionId,
    userId,
    timestampSec: input.timestampSec,
    text: input.text,
    type: 'manual',
  });

  return {
    noteId: String(note._id),
    sessionId: String(note.sessionId),
    userId: String(note.userId),
    timestampSec: note.timestampSec,
    text: note.text,
    type: note.type,
    createdAt: note.createdAt.toISOString(),
  };
}

// ============================================================================
// Update note (manual only)
// ============================================================================

export async function updateNote(
  noteId: string,
  userId: string,
  input: UpdateNoteInput
): Promise<NoteDto> {
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) {
    throw new AppError(404, 'NOTE_NOT_FOUND', 'Catatan tidak ditemukan');
  }

  if (note.type !== 'manual') {
    throw new AppError(403, 'NOTE_NOT_EDITABLE', 'Hanya catatan manual yang dapat diedit');
  }

  note.text = input.text;
  await note.save();

  return toNoteDto(note);
}

// ============================================================================
// Delete note (manual only)
// ============================================================================

export async function deleteNote(noteId: string, userId: string): Promise<void> {
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) {
    throw new AppError(404, 'NOTE_NOT_FOUND', 'Catatan tidak ditemukan');
  }

  if (note.type !== 'manual') {
    throw new AppError(403, 'NOTE_NOT_DELETABLE', 'Hanya catatan manual yang dapat dihapus');
  }

  await note.deleteOne();
}
