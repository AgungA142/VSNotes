/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized error responses
 */

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@utils/responses/base-error-response';
import { logger } from '@config/logger';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError (custom application errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorResponse(err.code, err.message, err.statusCode, err.details)
    );
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((error) => ({
      path: error.path.join('.'),
      message: error.message,
    }));

    res.status(400).json(
      createErrorResponse(
        'VALIDATION_ERROR',
        'Request validation failed',
        400,
        details
      )
    );
    return;
  }

  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((error) => ({
      path: error.path,
      message: error.message,
    }));

    res.status(400).json(
      createErrorResponse(
        'VALIDATION_ERROR',
        'Database validation failed',
        400,
        details
      )
    );
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json(
      createErrorResponse(
        'INVALID_ID',
        `Invalid ${err.path}: ${err.value}`,
        400
      )
    );
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(
      createErrorResponse('INVALID_TOKEN', 'Invalid authentication token', 401)
    );
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(
      createErrorResponse('TOKEN_EXPIRED', 'Authentication token has expired', 401)
    );
    return;
  }

  // Handle MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    res.status(503).json(
      createErrorResponse(
        'DATABASE_ERROR',
        'Database connection error. Please try again later.',
        503
      )
    );
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json(
    createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again later.',
      500
    )
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json(
    createErrorResponse(
      'NOT_FOUND',
      `Route ${req.method} ${req.path} not found`,
      404
    )
  );
}
