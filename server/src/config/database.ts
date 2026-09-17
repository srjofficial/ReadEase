import dns from 'dns';
import mongoose, { ConnectOptions } from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

// Set public DNS servers to prevent Windows querySrv ECONNREFUSED issues for MongoDB Atlas SRV URIs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Fallback to system DNS
}

let isConnected = false;
let retryAttempt = 0;
const isProd = env.NODE_ENV === 'production';
const MAX_RETRIES = isProd ? 5 : 2;
const INITIAL_RETRY_DELAY_MS = isProd ? 2000 : 1000;

/**
 * Configure production-grade Mongoose connection options with pooling
 */
const mongooseOptions: ConnectOptions = {
  dbName: env.MONGODB_DATABASE_NAME,
  maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
  minPoolSize: env.MONGODB_MIN_POOL_SIZE,
  serverSelectionTimeoutMS: isProd ? env.MONGODB_CONNECT_TIMEOUT_MS : 2500,
  socketTimeoutMS: 45000,
  autoIndex: !isProd // Build indexes automatically in dev/test only
};

/**
 * Connect to MongoDB with retry-on-startup and backoff
 */
export const connectDatabase = async (): Promise<boolean> => {
  if (isConnected) {
    logger.info('MongoDB is already connected.');
    return true;
  }

  // Register connection lifecycle events once
  if (mongoose.connection.listenerCount('connected') === 0) {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info(
        {
          database: env.MONGODB_DATABASE_NAME,
          maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
          minPoolSize: env.MONGODB_MIN_POOL_SIZE
        },
        '🍃 MongoDB connection successfully established'
      );
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection encountered an error');
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB connection lost / disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB connection successfully re-established');
    });
  }

  while (retryAttempt < MAX_RETRIES) {
    try {
      retryAttempt++;
      logger.info(
        {
          attempt: retryAttempt,
          maxRetries: MAX_RETRIES,
          uri: env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
        },
        `Attempting MongoDB connection [${retryAttempt}/${MAX_RETRIES}]...`
      );

      await mongoose.connect(env.MONGODB_URI, mongooseOptions);
      isConnected = true;
      retryAttempt = 0;
      return true;
    } catch (error) {
      logger.error(
        { err: error, attempt: retryAttempt, maxRetries: MAX_RETRIES },
        `Failed to connect to MongoDB on attempt ${retryAttempt}`
      );

      if (retryAttempt >= MAX_RETRIES) {
        if (isProd) {
          logger.fatal(
            'Could not connect to MongoDB Atlas after maximum retry attempts. Exiting process.'
          );
          process.exit(1);
        } else {
          logger.warn(
            '⚠️ MongoDB is unreachable in development mode. Server will continue in standalone mode so frontend can run.'
          );
          return false;
        }
      }

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt - 1);
      logger.info(`Retrying MongoDB connection in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
};

/**
 * Disconnect cleanly from MongoDB during server termination
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection gracefully...');
    try {
      await mongoose.disconnect();
      isConnected = false;
      logger.info('MongoDB connection closed successfully.');
    } catch (err) {
      logger.error({ err }, 'Error occurred while closing MongoDB connection.');
    }
  }
};

/**
 * Helper to inspect connection status for diagnostics & healthchecks
 */
export const getDatabaseStatus = () => {
  const stateMap: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const readyState = mongoose.connection.readyState;
  return {
    status: stateMap[readyState] || 'disconnected',
    readyState,
    database: env.MONGODB_DATABASE_NAME,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE
  };
};
