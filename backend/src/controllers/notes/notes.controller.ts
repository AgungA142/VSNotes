import { Request, Response, NextFunction } from 'express';
import {
  createNoteSchema,
  updateNoteSchema,
  noteQuerySchema,
} from '@utils/validation/notes/notes.validation';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from '@services/domain/notes/notes.service';
import { createSuccessResponse } from '@utils/responses/base-response';

export async function listNotesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = noteQuerySchema.parse(req.query);
    const data = await listNotes(req.params.id, req.user!.userId, query);
    res.status(200).json(createSuccessResponse(data, 200));
  } catch (err) {
    next(err);
  }
}

export async function createNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createNoteSchema.parse(req.body);
    const data = await createNote(req.params.id, req.user!.userId, input);
    res.status(201).json(createSuccessResponse(data, 201, 'Catatan berhasil ditambahkan'));
  } catch (err) {
    next(err);
  }
}

export async function updateNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = updateNoteSchema.parse(req.body);
    const data = await updateNote(req.params.id, req.user!.userId, input);
    res.status(200).json(createSuccessResponse(data, 200, 'Catatan berhasil diperbarui'));
  } catch (err) {
    next(err);
  }
}

export async function deleteNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteNote(req.params.id, req.user!.userId);
    res.status(200).json(createSuccessResponse(null, 200, 'Catatan berhasil dihapus'));
  } catch (err) {
    next(err);
  }
}
