import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
