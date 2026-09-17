import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger, apiRateLimiter, errorHandler, notFound } from './middleware';
import { apiRouter } from './routes';
import { healthController } from './controllers';

export const createApp = (): Express => {
  const app = express();

  // 1. Trust proxy for rate limiting behind load balancers / reverse proxies
  app.set('trust proxy', 1);

  // 2. Structured Request Logging (Pino)
  app.use(requestLogger);

  // 3. Secure HTTP Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      frameguard: {
        action: 'deny'
      }
    })
  );

  // 4. Strict CORS Whitelist
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. curl, postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV === 'development' && origin.startsWith('http://localhost:'))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
  };

  app.use(cors(corsOptions));

  // 5. Response Compression (gzip/deflate)
  app.use(
    compression({
      threshold: 1024, // only compress responses above 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    })
  );

  // 6. Request Body & Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 7. Health Check Endpoints (Directly accessible without rate limit blocks for load balancers)
  app.get('/health', healthController.getHealth);
  app.get('/api/health', healthController.getHealth);
  app.get(`${env.API_PREFIX}/health`, healthController.getHealth);

  // 8. General Rate Limiter for all API routes
  app.use('/api', apiRateLimiter);
  if (env.API_PREFIX !== '/api') {
    app.use(env.API_PREFIX, apiRateLimiter);
  }

  // 9. Mount Modular API Routes
  app.use(env.API_PREFIX, apiRouter);
  if (env.API_PREFIX !== '/api') {
    app.use('/api', apiRouter);
  }

  // 10. 404 Handler
  app.use(notFound);

  // 11. Centralized Error Handler (Masks stack traces in production)
  app.use(errorHandler);

  return app;
};
