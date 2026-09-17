import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@readease/shared';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProduction = env.NODE_ENV === 'production';

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    logger.warn(
      {
        path: req.originalUrl,
        method: req.method,
        errors: formattedErrors
      },
      'Request validation error'
    );

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data provided',
        details: formattedErrors
      },
      timestamp: new Date().toISOString()
    };

    res.status(422).json(response);
    return;
  }

  // 2. Known Operational Domain Errors (AppError)
  if (err instanceof AppError) {
    logger.warn(
      {
        statusCode: err.statusCode,
        errorCode: err.errorCode,
        path: req.originalUrl,
        method: req.method,
        details: err.details
      },
      err.message
    );

    const response: ApiResponse = {
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details
      },
      timestamp: new Date().toISOString()
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // 3. JSON Syntax Parsing Errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    logger.warn({ path: req.originalUrl, method: req.method }, 'Malformed JSON body');
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body'
      },
      timestamp: new Date().toISOString()
    };

    res.status(400).json(response);
    return;
  }

  // 4. Unexpected / Internal Server Errors
  logger.error(
    {
      err,
      path: req.originalUrl,
      method: req.method,
      stack: err.stack
    },
    'Unhandled internal server error'
  );

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'An unexpected internal server error occurred' : err.message,
      ...(isProduction ? {} : { details: err.stack })
    },
    timestamp: new Date().toISOString()
  };

  res.status(500).json(response);
};
