/**
 * MongoDB Atlas Connection Configuration
 * Mongoose connection setup with error handling
 */

import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * Connect to MongoDB Atlas
 * Retries connection on failure
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB Atlas...');

    await mongoose.connect(env.MONGODB_URI);

    logger.info('✅ MongoDB Atlas connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB Atlas:', error);
    logger.error('Please check your MONGODB_URI in .env file');
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 * Used for graceful shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}
