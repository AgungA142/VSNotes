import type { AuthTokenPayload } from './auth/auth.dto';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
