import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { AppError } from '../utils/errors';

/**
 * Ensures MongoDB is connected before attempting database operations.
 * Attempts an on-demand connection if MongoDB came online or was previously disconnected.
 * Fails fast with 503 Service Unavailable only if database is completely unreachable.
 */
export const requireDatabase = async (
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
    } catch {
      // Handled by the check below
    }
  }

  if (mongoose.connection.readyState !== 1) {
    return next(
      new AppError(
        'Database connection is currently unavailable. Please verify MongoDB service or Atlas connection string in .env.',
        503,
        'DATABASE_UNAVAILABLE'
      )
    );
  }
  next();
};
