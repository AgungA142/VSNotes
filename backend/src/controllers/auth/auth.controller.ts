import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '@utils/validation/auth/auth.validation';
import { forgotPasswordSchema } from '@utils/validation/auth/forgot-password.validation';
import { resetPasswordSchema } from '@utils/validation/auth/reset-password.validation';
import { register, login, refreshToken } from '@services/domain/auth/auth.service';
import { forgotPassword } from '@services/domain/auth/forgot-password.service';
import { resetPassword } from '@services/domain/auth/reset-password.service';
import { createSuccessResponse } from '@utils/responses/base-response';

const TEMPLATES_DIR = path.join(
  __dirname,
  '../../services/integrations/email/templates'
);

function renderHtml(templateName: string, vars: Record<string, string> = {}): string {
  let html = fs.readFileSync(path.join(TEMPLATES_DIR, `${templateName}.html`), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const data = await register(input);
    res.status(201).json(createSuccessResponse(data, 201, 'Registrasi berhasil'));
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const data = await login(input);
    res.status(200).json(createSuccessResponse(data, 200, 'Login berhasil'));
  } catch (err) {
    next(err);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, email } = req.user!;
    const data = await refreshToken(userId, email);
    res.status(200).json(createSuccessResponse(data, 200, 'Token berhasil diperbarui'));
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await forgotPassword(email);
    res.status(200).json(
      createSuccessResponse(null, 200, 'Jika email terdaftar, kami telah mengirim tautan reset password. Periksa kotak masuk Anda.')
    );
  } catch (err) {
    next(err);
  }
}

// GET /v1/auth/reset-password?token=xxx — tampilkan form HTML di browser
export async function resetPasswordFormHandler(req: Request, res: Response): Promise<void> {
  const token = String(req.query['token'] ?? '');

  if (!token) {
    const html = renderHtml('reset-password-error', {
      errorMessage: 'Token reset password tidak ditemukan. Pastikan Anda membuka tautan lengkap dari email.',
    });
    res.status(400).send(html);
    return;
  }

  const html = renderHtml('reset-password-form', { token, errorMessage: '' });
  res.status(200).send(html);
}

// POST /v1/auth/reset-password — proses form submit
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Deteksi apakah request dari form HTML (Accept: text/html) atau API (Accept: application/json)
  const acceptsHtml = req.headers['accept']?.includes('text/html') ||
    req.headers['content-type']?.includes('application/x-www-form-urlencoded');

  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorMessage = parsed.error.errors.map((e) => e.message).join(' ');
      if (acceptsHtml) {
        const token = String(req.body.token ?? '');
        const html = renderHtml('reset-password-form', { token, errorMessage });
        res.status(400).send(html);
        return;
      }
      res.status(400).json({
        success: false,
        status_code: 400,
        error: { code: 'VALIDATION_ERROR', message: errorMessage, details: parsed.error.errors },
      });
      return;
    }

    await resetPassword(parsed.data.token, parsed.data.password);

    if (acceptsHtml) {
      const html = renderHtml('reset-password-success');
      res.status(200).send(html);
      return;
    }

    res.status(200).json(createSuccessResponse(null, 200, 'Password berhasil diubah. Silakan login kembali.'));
  } catch (err) {
    if (acceptsHtml && err instanceof Error && 'statusCode' in err) {
      const html = renderHtml('reset-password-error', { errorMessage: err.message });
      res.status(400).send(html);
      return;
    }
    next(err);
  }
}
