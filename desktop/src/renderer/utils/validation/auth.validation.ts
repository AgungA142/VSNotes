import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
    email: z.string().email('Format email tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .max(100, 'Password maksimal 100 karakter')
      .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
      .regex(/[0-9]/, 'Password harus mengandung angka')
      .regex(/[^a-zA-Z0-9]/, 'Password harus mengandung simbol (contoh: !@#$%)'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
