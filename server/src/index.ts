import { env } from './config/env';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

const startServer = async () => {
  // 1. Initialize MongoDB connection (with retry logic)
  await connectDatabase();

  // 2. Initialize Express application
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        environment: env.NODE_ENV,
        prefix: env.API_PREFIX
      },
      `🚀 ReadEase API Server running on port ${env.PORT} [${env.NODE_ENV}]`
    );
    logger.info(`📡 Healthcheck available at: http://localhost:${env.PORT}/api/health`);
  });

  // 3. Graceful Shutdown Handler
  const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, `Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed successfully.');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force shutdown if cleanup takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught Exception detected');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled Rejection detected');
    process.exit(1);
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, 'Fatal error during server startup');
  process.exit(1);
});
