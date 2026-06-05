import { z } from 'zod';

export const uploadAudioSchema = z.object({
  audioData: z
    .string()
    .min(1, 'audioData tidak boleh kosong')
    .refine((val) => isBase64(val), { message: 'audioData harus berupa string base64 valid' }),
  durationSec: z
    .number({ invalid_type_error: 'durationSec harus berupa angka' })
    .min(1, 'durationSec minimal 1 detik')
    .max(60, 'durationSec maksimal 60 detik'),
  capturedAt: z.string().datetime({ offset: true, message: 'Format capturedAt tidak valid (harus ISO 8601)' }),
});

function isBase64(str: string): boolean {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

export type UploadAudioInput = z.infer<typeof uploadAudioSchema>;
