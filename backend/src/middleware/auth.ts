import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { keys, redis } from '../lib/redis.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time password check (hashing first makes both buffers equal length). */
export const isValidPassword = (candidate: string) => timingSafeEqual(digest(candidate), digest(env.ADMIN_PASSWORD));

/** Every token gets a unique id (jti) so it can be revoked individually on sign-out. */
export const signAdminToken = () =>
  jwt.sign({ role: 'admin' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
  });

const bearerToken = (req: Request) => {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
};

function verifyAdminToken(token: string): jwt.JwtPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === 'object' && payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = verifyAdminToken(bearerToken(req));
    if (payload) {
      const revoked = payload.jti ? await redis.exists(keys.revokedToken(payload.jti)) : 0;
      if (!revoked) return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    next(error);
  }
}

/** Sign-out: the token stops working immediately instead of living on until it expires. */
export async function revokeToken(req: Request): Promise<void> {
  const payload = verifyAdminToken(bearerToken(req));
  if (!payload?.jti || !payload.exp) return;
  const secondsLeft = Math.max(payload.exp - Math.floor(Date.now() / 1000), 1);
  // The entry disappears exactly when the token would have expired anyway.
  await redis.set(keys.revokedToken(payload.jti), '1', 'EX', secondsLeft);
}
