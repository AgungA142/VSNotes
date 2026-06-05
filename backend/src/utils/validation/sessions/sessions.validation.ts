import { z } from 'zod';

export const createSessionSchema = z.object({
  videoTitle: z.string().min(1, 'Judul video tidak boleh kosong').max(500),
  sourceApp: z.string().min(1, 'Nama aplikasi tidak boleh kosong').max(100),
  sourceType: z.enum(['local', 'streaming'], {
    errorMap: () => ({ message: "sourceType harus 'local' atau 'streaming'" }),
  }),
  deviceId: z.string().min(1, 'Device ID tidak boleh kosong').max(100),
});

export const updateSessionSchema = z.object({
  status: z.enum(['active', 'completed', 'dismissed']).optional(),
  endedAt: z.string().datetime({ message: 'Format endedAt tidak valid' }).optional(),
  durationSec: z.number().min(0).optional(),
});

export const sessionQuerySchema = z.object({
  page: z.string().default('1').transform(Number).pipe(z.number().min(1)),
  limit: z.string().default('20').transform(Number).pipe(z.number().min(1).max(100)),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;
