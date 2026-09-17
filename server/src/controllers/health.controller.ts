import { Request, Response } from 'express';
import type { HealthCheckResponse } from '@readease/shared';
import { env } from '../config/env';
import { getDatabaseStatus } from '../config/database';

export const getHealth = (_req: Request, res: Response): void => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const dbStatus = getDatabaseStatus();

  const response: HealthCheckResponse & {
    environment: string;
    uptimeSeconds: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
    };
    database: ReturnType<typeof getDatabaseStatus>;
  } = {
    status: dbStatus.status === 'connected' ? 'ok' : 'degraded',
    service: 'readease-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptimeSeconds,
    memory: {
      rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024))
    },
    database: dbStatus
  };

  res.status(200).json(response);
};
