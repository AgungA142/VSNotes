/**
 * Backend Server Entry Point
 * Express API server with MongoDB connection, Swagger docs, and middleware
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

// Configuration imports (env must be first to validate environment)
import { env } from '@config/env';
import { logger } from '@config/logger';
import { connectDatabase, disconnectDatabase } from '@config/db';
import { swaggerSpec } from '@config/swagger';

// Middleware imports
import { requestLogger } from '@middleware/request-logger';
import { errorHandler, notFoundHandler } from '@middleware/error-handler';

// Response utilities
import { createSuccessResponse } from '@utils/responses/base-response';

// Routes
import apiRouter from '@routes/index';

// Background jobs
import { startAutoNotesScheduler, stopAutoNotesScheduler } from '@jobs/auto-notes.job';
import { startSyncJobScheduler, stopSyncJobScheduler } from '@jobs/sync.job';
import { startStaleSessionsScheduler, stopStaleSessionsScheduler } from '@jobs/stale-sessions.job';

/**
 * Initialize Express application
 */
const app = express();

/**
 * Middleware Setup
 */

// CORS configuration
// env.CORS_ORIGINS: array dari HTTP/HTTPS origins yang diizinkan
// Electron menggunakan custom protocol app:// — diizinkan tanpa perlu masuk ke CORS_ORIGINS env
app.use(
  cors({
    origin: (origin, callback) => {
      // Electron renderer: protocol app:// atau null (file:// fallback)
      if (!origin || origin.startsWith('app://')) {
        return callback(null, true);
      }
      if (env.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin '${origin}' tidak diizinkan oleh CORS`));
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

/**
 * API Documentation
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Health Check Endpoint
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns server health status and uptime
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseResponse'
 *             example:
 *               success: true
 *               data:
 *                 status: ok
 *                 timestamp: 2024-01-15T10:30:00.000Z
 *                 uptime: 3600
 *                 environment: development
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json(
    createSuccessResponse(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
      },
      200
    )
  );
});

/**
 * API Root Endpoint
 */
app.get('/v1', (_req: Request, res: Response) => {
  res.json(
    createSuccessResponse(
      {
        message: 'Video Summary & Auto-Notes API',
        version: '1.0.0',
        documentation: '/api-docs',
      },
      200
    )
  );
});

/**
 * API Routes
 */
app.use('/v1', apiRouter);

/**
 * Error Handling
 */
app.use(notFoundHandler); // 404 handler
app.use(errorHandler); // Global error handler

/**
 * Start Server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start background jobs
    startAutoNotesScheduler();
    startSyncJobScheduler();
    startStaleSessionsScheduler();

    // Start Express server
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
      logger.info(`📚 API docs available at http://localhost:${env.PORT}/api-docs`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`✅ Server started successfully`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    stopAutoNotesScheduler();
    stopSyncJobScheduler();
    stopStaleSessionsScheduler();
    await disconnectDatabase();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
