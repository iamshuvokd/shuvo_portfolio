import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/errors.js';
import { contactSchema } from '../schemas/content.js';
import { getContent } from '../services/content.service.js';
import { getMedia } from '../services/media.service.js';
import { addMessage } from '../services/messages.service.js';
import { addSseClient, connectedClients } from '../lib/sse.js';
import { redis } from '../lib/redis.js';

export const publicRouter = Router();

/** General guard for public reads. Health checks (monitors) and the stream (has its own caps) are exempt. */
const publicLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.PUBLIC_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/content/stream',
  message: { error: 'Too many requests, please slow down.' },
});

publicRouter.use(publicLimiter);

const contactLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.CONTACT_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many messages, please try again in a minute.' },
});

publicRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    // A health check must report trouble, not fail with a generic 500, so monitors and load balancers can act on it.
    let redisOk = false;
    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      redisOk = false;
    }
    res.status(redisOk ? 200 : 503).json({ status: redisOk ? 'ok' : 'degraded', redis: redisOk, liveClients: connectedClients() });
  }),
);

publicRouter.get(
  '/content',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await getContent());
  }),
);

/** Live updates: the browser opens this once and receives every published change. */
publicRouter.get(
  '/content/stream',
  asyncHandler(async (req, res) => {
    addSseClient(req, res, await getContent());
  }),
);

publicRouter.get(
  '/media/:id',
  asyncHandler(async (req, res) => {
    const media = await getMedia(String(req.params.id));
    if (!media) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.set({
      'Content-Type': media.meta.mime,
      'Content-Length': String(media.data.length),
      'Content-Disposition': `inline; filename="${media.meta.name}"`,
      // IDs are random and never reused, so the bytes behind one are immutable.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(media.data);
  }),
);

publicRouter.post(
  '/contact',
  contactLimiter,
  asyncHandler(async (req, res) => {
    const input = contactSchema.parse(req.body);
    await addMessage(input);
    res.status(201).json({ ok: true });
  }),
);
