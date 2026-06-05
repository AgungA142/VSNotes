/**
 * HTTP Request Logger Middleware
 * Logs all incoming HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';

/**
 * Request logger middleware
 * Logs method, path, status code, and response time
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, path, ip } = req;
    const { statusCode } = res;

    logger.http(`${method} ${path} ${statusCode} - ${duration}ms - ${ip}`);
  });

  next();
}
