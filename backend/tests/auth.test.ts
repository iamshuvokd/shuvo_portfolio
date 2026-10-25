import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { bearer, loadApp, login } from './helpers.js';

let app: Awaited<ReturnType<typeof loadApp>>['app'];
let redis: Awaited<ReturnType<typeof loadApp>>['redis'];

beforeAll(async () => {
  ({ app, redis } = await loadApp({ LOGIN_RATE_LIMIT: '3' }));
});
afterAll(async () => {
  await redis.quit();
});

describe('B11: the login limit counts failed attempts only', () => {
  it('lets the owner sign in many times without being locked out', async () => {
    for (let i = 0; i < 8; i += 1) expect((await login(app)).status).toBe(200); // the limit is 3
  });

  it('still blocks brute force after the allowed number of wrong passwords', async () => {
    const wrong = () => request(app).post('/api/admin/login').send({ password: 'not-it' });
    for (let i = 0; i < 3; i += 1) expect((await wrong()).status).toBe(401);
    expect((await wrong()).status).toBe(429);
    expect((await login(app)).status).toBe(429); // even the right password waits out the window
  });
});

describe('B20: sign-out revokes the token', () => {
  it('a token stops working immediately after logout; other sessions are unaffected', async () => {
    const fresh = await loadApp({ LOGIN_RATE_LIMIT: '1000' });
    const first = await login(fresh.app);
    const second = await login(fresh.app);

    expect((await request(fresh.app).get('/api/admin/content').set(bearer(first.token))).status).toBe(200);
    expect((await request(fresh.app).post('/api/admin/logout').set(bearer(first.token))).status).toBe(204);

    expect((await request(fresh.app).get('/api/admin/content').set(bearer(first.token))).status).toBe(401);
    expect((await request(fresh.app).get('/api/admin/content').set(bearer(second.token))).status).toBe(200);
  });

  it('logout requires a valid token', async () => {
    expect((await request(app).post('/api/admin/logout')).status).toBe(401);
  });

  it('revocation entries expire on their own (no unbounded growth)', async () => {
    const fresh = await loadApp({ LOGIN_RATE_LIMIT: '1000' });
    const { token } = await login(fresh.app);
    await request(fresh.app).post('/api/admin/logout').set(bearer(token));
    const keys = await fresh.redis.keys('portfolio:revoked:*');
    expect(keys).toHaveLength(1);
    expect(await fresh.redis.ttl(keys[0])).toBeGreaterThan(0);
  });
});

describe('B15: health reports a Redis outage instead of crashing', () => {
  it('returns 200 when Redis is up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', redis: true });
  });

  it('returns 503 and redis:false when Redis is unreachable', async () => {
    const spy = vi.spyOn(redis, 'ping').mockRejectedValueOnce(new Error('connection lost'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', redis: false, liveClients: 0 });
    spy.mockRestore();
  });
});
