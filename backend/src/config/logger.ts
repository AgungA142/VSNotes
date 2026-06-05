/**
 * Logger Configuration
 * Winston logger setup with custom formatting
 */

import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }), // Include stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport with colors in development
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'development'
          ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat)
          : combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), logFormat),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), logFormat),
    }),
  ],
});

// Create a stream for Morgan HTTP logging middleware
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
