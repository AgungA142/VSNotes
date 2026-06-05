/**
 * Notes Routes
 * GET    /v1/sessions/:id/notes
 * POST   /v1/sessions/:id/notes
 * PATCH  /v1/notes/:id
 * DELETE /v1/notes/:id
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import {
  listNotesHandler,
  createNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
} from '@controllers/notes/notes.controller';

// Session-scoped: GET /sessions/:id/notes, POST /sessions/:id/notes
export const notesSessionRouter: Router = Router({ mergeParams: true });
notesSessionRouter.use(authenticate);
notesSessionRouter.get('/:id/notes', listNotesHandler);
notesSessionRouter.post('/:id/notes', createNoteHandler);

// Note-scoped: PATCH /notes/:id, DELETE /notes/:id
export const notesRouter: Router = Router();
notesRouter.use(authenticate);
notesRouter.patch('/:id', updateNoteHandler);
notesRouter.delete('/:id', deleteNoteHandler);
