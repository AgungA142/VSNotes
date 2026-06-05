import { z } from 'zod';

export const createNoteSchema = z.object({
  text: z.string().min(1, 'Teks catatan tidak boleh kosong').max(2000),
  timestampSec: z.number().min(0, 'Timestamp tidak boleh negatif'),
});

export const updateNoteSchema = z.object({
  text: z.string().min(1, 'Teks catatan tidak boleh kosong').max(2000),
});

export const noteQuerySchema = z.object({
  type: z.enum(['auto', 'manual']).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteQueryInput = z.infer<typeof noteQuerySchema>;
