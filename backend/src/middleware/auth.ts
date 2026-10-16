import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time password check (hashing first makes both buffers equal length). */
export const isValidPassword = (candidate: string) => timingSafeEqual(digest(candidate), digest(env.ADMIN_PASSWORD));

export const signAdminToken = () =>
  jwt.sign({ role: 'admin' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'object' && payload.role === 'admin') return next();
  } catch {
    // fall through to 401
  }
  res.status(401).json({ error: 'Unauthorized' });
}
