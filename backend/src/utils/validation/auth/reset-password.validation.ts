import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(100, 'Password maksimal 100 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital')
  .regex(
    /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password harus mengandung minimal 1 angka atau simbol'
  );

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token tidak boleh kosong'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Konfirmasi password tidak boleh kosong'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
