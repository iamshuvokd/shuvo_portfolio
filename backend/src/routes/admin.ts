import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { keys, redis } from '../lib/redis.js';
import { isValidPassword, requireAdmin, revokeToken, signAdminToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { contentSchema } from '../schemas/content.js';
import { getContent, resetContent, saveContent } from '../services/content.service.js';
import { allowedMime, deleteMedia, deleteUnusedMedia, isValidFile, listMedia, referencedMediaIds, saveMedia } from '../services/media.service.js';
import { listGithubRepos } from '../services/github.service.js';
import { deleteMessage, listMessages } from '../services/messages.service.js';

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Only failed attempts count: signing in and out repeatedly must not lock the owner out.
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again later.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

adminRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
    if (!isValidPassword(password)) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }
    res.json({ token: signAdminToken() });
  }),
);

// Everything below requires a valid admin token.
adminRouter.use(requireAdmin);

adminRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeToken(req);
    res.status(204).end();
  }),
);

adminRouter.get('/session', (_req, res) => {
  res.json({ ok: true });
});

adminRouter.get(
  '/content',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await getContent());
  }),
);

/** Optional `X-Content-Revision` header = the revision the editor started from (optimistic concurrency). */
function parseExpectedRevision(header: string | undefined): number | undefined {
  if (header === undefined || header === '') return undefined;
  if (!/^\d+$/.test(header)) throw new HttpError(400, 'X-Content-Revision must be a whole number');
  return Number(header);
}

adminRouter.put(
  '/content',
  asyncHandler(async (req, res) => {
    const content = contentSchema.parse(req.body);
    const revision = await saveContent(content, parseExpectedRevision(req.header('x-content-revision')));
    res.json({ revision });
  }),
);

adminRouter.post(
  '/content/reset',
  asyncHandler(async (_req, res) => {
    res.json({ revision: await resetContent() });
  }),
);

adminRouter.get(
  '/media',
  asyncHandler(async (_req, res) => {
    res.json({ items: await listMedia() });
  }),
);

adminRouter.post(
  '/media',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded (field name: file)' });
      return;
    }
    if (!allowedMime.includes(file.mimetype) || !isValidFile(file.mimetype, file.buffer)) {
      res.status(415).json({ error: 'Only PNG, JPEG, GIF, WebP images and PDF files are allowed' });
      return;
    }
    const meta = await saveMedia(file.buffer, file.mimetype, file.originalname);
    res.status(201).json({ ...meta, url: `/api/media/${meta.id}` });
  }),
);

/** Raw stored document, used to find which uploads the live site still references. */
const storedContentJson = async () => (await redis.get(keys.content)) ?? '';

adminRouter.delete(
  '/media/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    // Refuse to break the live site by default; the admin can confirm with ?force=1.
    if (req.query.force !== '1' && referencedMediaIds(await storedContentJson()).has(id.toLowerCase())) {
      throw new HttpError(409, 'This file is used on the live site. Remove it from the content first, or delete it anyway.', { inUse: true });
    }
    await deleteMedia(id);
    res.status(204).end();
  }),
);

/** Removes uploads no published content references (old replaced photos, abandoned uploads). */
adminRouter.post(
  '/media/cleanup',
  asyncHandler(async (req, res) => {
    const { olderThanMinutes } = z.object({ olderThanMinutes: z.coerce.number().min(0).max(525_600).default(60) }).parse(req.query);
    res.json({ deleted: await deleteUnusedMedia(await storedContentJson(), olderThanMinutes) });
  }),
);

adminRouter.get(
  '/messages',
  asyncHandler(async (_req, res) => {
    res.json({ items: await listMessages() });
  }),
);

adminRouter.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    await deleteMessage(String(req.params.id));
    res.status(204).end();
  }),
);

adminRouter.get(
  '/github/repos',
  asyncHandler(async (req, res) => {
    const { username, refresh } = z
      .object({ username: z.string().trim().min(1).max(39), refresh: z.enum(['1', '0']).optional() })
      .parse(req.query);
    res.json(await listGithubRepos(username, refresh === '1'));
  }),
);
