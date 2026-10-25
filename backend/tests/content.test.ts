import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, loadApp, login } from './helpers.js';

let app: Awaited<ReturnType<typeof loadApp>>['app'];
let redis: Awaited<ReturnType<typeof loadApp>>['redis'];
let token: string | undefined;

const load = async () => (await request(app).get('/api/admin/content').set(bearer(token))).body as { content: any; revision: number };
const put = (content: unknown, revision?: number) => {
  const req = request(app).put('/api/admin/content').set(bearer(token));
  if (revision !== undefined) req.set('X-Content-Revision', String(revision));
  return req.send(content as object);
};

beforeAll(async () => {
  ({ app, redis } = await loadApp({ LOGIN_RATE_LIMIT: '1000' }));
  token = (await login(app)).token;
});
afterAll(async () => {
  await redis.quit();
});

describe('B6: optimistic concurrency for content saves', () => {
  it('a save based on the current revision succeeds and bumps the revision', async () => {
    const { content, revision } = await load();
    content.profile.phone = '+8801000000001';
    const res = await put(content, revision);
    expect(res.status).toBe(200);
    expect(res.body.revision).toBe(revision + 1);
  });

  it('a stale save is refused with 409 and nothing is overwritten', async () => {
    const adminA = await load();
    const adminB = await load(); // both opened the editor at the same revision

    adminA.content.profile.phone = '+8801111111111';
    expect((await put(adminA.content, adminA.revision)).status).toBe(200);

    adminB.content.profile.location = 'Edited by B';
    const stale = await put(adminB.content, adminB.revision);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatch(/changed by someone else/);
    expect(typeof stale.body.revision).toBe('number');

    const now = await load();
    expect(now.content.profile.phone).toBe('+8801111111111'); // A kept
    expect(now.content.profile.location).not.toBe('Edited by B'); // B refused
  });

  it('a deliberate overwrite (no revision header) still works', async () => {
    const { content } = await load();
    content.profile.location = 'Forced';
    expect((await put(content)).status).toBe(200);
    expect((await load()).content.profile.location).toBe('Forced');
  });

  it('two simultaneous saves from the same revision: exactly one wins', async () => {
    const { content, revision } = await load();
    const a = structuredClone(content);
    const b = structuredClone(content);
    a.profile.phone = '+8801222222222';
    b.profile.phone = '+8801333333333';

    const results = await Promise.all([put(a, revision), put(b, revision)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('rejects a malformed revision header', async () => {
    const { content } = await load();
    const res = await request(app).put('/api/admin/content').set(bearer(token)).set('X-Content-Revision', 'abc').send(content);
    expect(res.status).toBe(400);
  });
});
