import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';

/** Development only: localhost and private-network origins (e.g. testing from your phone on the LAN). */
const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

export function createApp() {
  const app = express();

  // Behind a reverse proxy (nginx, Render, Fly...) the real client IP is needed for rate limiting.
  if (env.isProd) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  // Media is embedded by the frontend, which may live on another origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin / curl / server-to-server.
        // Disallowed origins just get no CORS headers (the browser blocks them); never a 500.
        const allowed = !origin || env.corsOrigins.includes(origin) || (!env.isProd && localOrigin.test(origin));
        callback(null, allowed);
      },
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
