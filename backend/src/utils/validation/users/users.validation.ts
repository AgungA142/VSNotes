import { z } from 'zod';

export const updateUserSettingsSchema = z.object({
  summaryLengthPref: z.enum(['short', 'medium', 'long']).optional(),
  autoStartSession: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  watchPlatforms: z
    .array(
      z.string()
        .trim()
        .toLowerCase()
        .min(1, 'Nama platform tidak boleh kosong')
        .max(50, 'Nama platform maksimal 50 karakter')
    )
    .min(1, 'Daftar platform tidak boleh kosong')
    .max(50, 'Maksimal 50 platform')
    .optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
