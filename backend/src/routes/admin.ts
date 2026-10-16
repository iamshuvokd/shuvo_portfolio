import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { isValidPassword, requireAdmin, signAdminToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { contentSchema } from '../schemas/content.js';
import { getContent, resetContent, saveContent } from '../services/content.service.js';
import { allowedMime, deleteMedia, isValidFile, listMedia, saveMedia } from '../services/media.service.js';
import { listGithubRepos } from '../services/github.service.js';
import { deleteMessage, listMessages } from '../services/messages.service.js';

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
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

adminRouter.put(
  '/content',
  asyncHandler(async (req, res) => {
    const content = contentSchema.parse(req.body);
    const revision = await saveContent(content);
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

adminRouter.delete(
  '/media/:id',
  asyncHandler(async (req, res) => {
    await deleteMedia(String(req.params.id));
    res.status(204).end();
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
    res.json({ items: await listGithubRepos(username, refresh === '1') });
  }),
);
