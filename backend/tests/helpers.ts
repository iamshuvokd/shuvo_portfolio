import type { Express } from 'express';
import request from 'supertest';
import { vi } from 'vitest';

export const ADMIN_PASSWORD = 'unit-test-admin-password';

/** Fresh module graph per test file, so each file can set its own limits through env first. */
export async function loadApp(env: Record<string, string> = {}): Promise<{ app: Express; redis: typeof import('../src/lib/redis.js').redis }> {
  Object.assign(process.env, env);
  vi.resetModules(); // new limiters / config for every call
  const [{ createApp }, { redis }] = await Promise.all([import('../src/app.js'), import('../src/lib/redis.js')]);
  if (!process.env.REDIS_URL?.endsWith('/14')) throw new Error('Refusing to run tests against a Redis database other than 14');
  await redis.flushdb();
  return { app: createApp(), redis };
}

export async function login(app: Express, password = ADMIN_PASSWORD) {
  const res = await request(app).post('/api/admin/login').send({ password });
  return { status: res.status, token: res.body.token as string | undefined };
}

export const bearer = (token: string | undefined) => ({ Authorization: `Bearer ${token}` });
