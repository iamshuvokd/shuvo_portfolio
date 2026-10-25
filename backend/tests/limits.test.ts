import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadApp } from './helpers.js';

let app: Awaited<ReturnType<typeof loadApp>>['app'];
let redis: Awaited<ReturnType<typeof loadApp>>['redis'];
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  ({ app, redis } = await loadApp({ PUBLIC_RATE_LIMIT: '20', SSE_MAX_PER_IP: '2', SSE_MAX_TOTAL: '1000' }));
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  server.close();
  await redis.quit();
});

describe('B7: public endpoints have abuse limits', () => {
  it('rate limits public reads per IP (429 with a JSON error)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 30; i += 1) statuses.push((await request(app).get('/api/content')).status);

    expect(statuses.filter((s) => s === 200).length).toBe(20);
    expect(statuses.filter((s) => s === 429).length).toBe(10);
    const blocked = await request(app).get('/api/content');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many requests, please slow down.' });
    expect(blocked.headers['ratelimit-policy'] ?? blocked.headers['ratelimit']).toBeDefined();
  });

  it('never rate limits health checks, so monitoring keeps working', async () => {
    for (let i = 0; i < 40; i += 1) expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('caps simultaneous live-update connections per IP and frees a slot when one closes', async () => {
    const open = async () => {
      const controller = new AbortController();
      const res = await fetch(`${baseUrl}/api/content/stream`, { signal: controller.signal });
      return { res, controller };
    };

    const first = await open();
    const second = await open();
    expect(first.res.status).toBe(200);
    expect(first.res.headers.get('content-type')).toContain('text/event-stream');
    expect(second.res.status).toBe(200);

    const third = await open(); // cap is 2 per IP
    expect(third.res.status).toBe(429);
    expect((await third.res.json()).error).toMatch(/Too many live connections/);
    expect(third.res.headers.get('retry-after')).toBe('30');

    first.controller.abort(); // closing one frees a slot
    await new Promise((resolve) => setTimeout(resolve, 300));
    const fourth = await open();
    expect(fourth.res.status).toBe(200);

    second.controller.abort();
    fourth.controller.abort();
  });
});
