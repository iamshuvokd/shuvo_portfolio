import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { weakPasswordReason } from '../src/lib/password-policy.js';
import { bearer, loadApp, login } from './helpers.js';

describe('B13: admin password policy', () => {
  it.each([
    ['iamshuvokd', 'at least 12'], // the real weak password: short and equal to the public GitHub name
    ['short1!', 'at least 12'],
    ['aaaaaaaaaaaaaaaa', 'repeated'],
    ['MyPassword12345', 'password'],
    ['shuvo-portfolio-2026', 'shuvo'],
    ['lowercaseletters', 'mix letters'],
  ])('rejects %s', (password, reason) => {
    expect(weakPasswordReason(password)).toContain(reason);
  });

  it.each(['correct-horse-battery-staple', 'Xk9#mQ2$vL7!pR4z', 'a1b2c3d4e5f6g7h8', 'averylongpassphraseallinlowercase'])('accepts %s', (password) => {
    expect(weakPasswordReason(password)).toBeNull();
  });
});

let app: Awaited<ReturnType<typeof loadApp>>['app'];
let redis: Awaited<ReturnType<typeof loadApp>>['redis'];
let token: string | undefined;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const upload = async (name: string) => (await request(app).post('/api/admin/media').set(bearer(token)).attach('file', PNG, { filename: name, contentType: 'image/png' })).body as { id: string; url: string };

describe('B19: deleting files that the live site uses', () => {
  beforeAll(async () => {
    ({ app, redis } = await loadApp({ LOGIN_RATE_LIMIT: '1000' }));
    token = (await login(app)).token;
  });
  afterAll(async () => {
    await redis.quit();
  });

  it('refuses to delete an in-use file (409) unless forced', async () => {
    const file = await upload('cv-photo.png');
    const { content, revision } = (await request(app).get('/api/admin/content').set(bearer(token))).body;
    content.profile.photoUrl = file.url;
    expect((await request(app).put('/api/admin/content').set(bearer(token)).set('X-Content-Revision', String(revision)).send(content)).status).toBe(200);

    const blocked = await request(app).delete(`/api/admin/media/${file.id}`).set(bearer(token));
    expect(blocked.status).toBe(409);
    expect(blocked.body).toMatchObject({ inUse: true });
    expect((await request(app).get(file.url)).status).toBe(200); // still served

    const forced = await request(app).delete(`/api/admin/media/${file.id}?force=1`).set(bearer(token));
    expect(forced.status).toBe(204);
    expect((await request(app).get(file.url)).status).toBe(404);
  });

  it('deletes an unused file without any fuss', async () => {
    const file = await upload('unused.png');
    expect((await request(app).delete(`/api/admin/media/${file.id}`).set(bearer(token))).status).toBe(204);
  });

  it('cleanup removes only unused files', async () => {
    const used = await upload('keep.png');
    const orphanA = await upload('orphan-a.png');
    const orphanB = await upload('orphan-b.png');
    const { content, revision } = (await request(app).get('/api/admin/content').set(bearer(token))).body;
    content.projects.items[0].image = used.url;
    await request(app).put('/api/admin/content').set(bearer(token)).set('X-Content-Revision', String(revision)).send(content);

    // Fresh uploads are protected by the age threshold (they may belong to an unpublished draft).
    const tooNew = await request(app).post('/api/admin/media/cleanup?olderThanMinutes=60').set(bearer(token));
    expect(tooNew.body.deleted).toBe(0);

    const swept = await request(app).post('/api/admin/media/cleanup?olderThanMinutes=0').set(bearer(token));
    expect(swept.body.deleted).toBeGreaterThanOrEqual(2);
    expect((await request(app).get(used.url)).status).toBe(200);
    expect((await request(app).get(orphanA.url)).status).toBe(404);
    expect((await request(app).get(orphanB.url)).status).toBe(404);
  });

  it('cleanup requires admin auth', async () => {
    expect((await request(app).post('/api/admin/media/cleanup')).status).toBe(401);
  });
});
