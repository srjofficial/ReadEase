import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

/**
 * Ensures MongoDB is connected before attempting database operations.
 * Fails fast with 503 Service Unavailable if database is offline.
 */
export const requireDatabase = (_req: Request, _res: Response, next: NextFunction): void => {
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
