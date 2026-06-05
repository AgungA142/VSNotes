import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(100, 'Password maksimal 100 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital')
  .regex(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password harus mengandung minimal 1 angka atau simbol');

export const registerSchema = z
  .object({
    email: z.string().email('Email tidak valid').toLowerCase().trim(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Konfirmasi password tidak boleh kosong'),
    name: z.string().min(1, 'Nama tidak boleh kosong').max(100, 'Nama maksimal 100 karakter').trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid').toLowerCase().trim(),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
