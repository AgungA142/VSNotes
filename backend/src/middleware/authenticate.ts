import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@utils/jwt/jwt.util';
import { createErrorResponse } from '@utils/responses/base-error-response';
import { User } from '@models/User';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(
      createErrorResponse('UNAUTHORIZED', 'Token autentikasi diperlukan', 401)
    );
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);

    // Jika password diubah setelah token diterbitkan, token dianggap tidak valid
    if (payload.iat) {
      const user = await User.findById(payload.userId).select('passwordChangedAt').lean();
      const changedAt = (user as { passwordChangedAt?: Date | null } | null)?.passwordChangedAt;
      if (changedAt && Math.floor(changedAt.getTime() / 1000) > payload.iat) {
        res.status(401).json(
          createErrorResponse(
            'TOKEN_INVALIDATED',
            'Sesi tidak valid karena password telah diubah. Silakan login kembali.',
            401
          )
        );
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    // Pass JWT errors (JsonWebTokenError, TokenExpiredError) to global error handler
    next(err);
  }
}
