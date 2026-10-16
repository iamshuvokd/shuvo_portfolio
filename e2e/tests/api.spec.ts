import { ADMIN_PASSWORD, API_URL } from './support/env';
import { expect, PDF_BYTES, PNG_BYTES, test } from './support/fixtures';

const upload = (request: any, token: string, buffer: Buffer, mimeType: string, name: string) =>
  request.post('/api/admin/media', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name, mimeType, buffer } },
  });

test.describe('API: health & public content', () => {
  test('health reports Redis connected', async ({ request, api }) => {
    const res = await api.request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', redis: true });
  });

  test('GET /content returns the seeded site document', async ({ api }) => {
    const content = await api.publicContent();
    expect(content.profile.name).toBe('Shuvo Kumar Das');
    expect(content.projects.items.length).toBeGreaterThanOrEqual(4);
    expect(content.hero.roles.length).toBeGreaterThan(0);
  });

  test('unknown API route returns JSON 404', async ({ api }) => {
    const res = await api.request.get('/api/does-not-exist');
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

test.describe('API: authentication', () => {
  test('admin endpoints require a token', async ({ api }) => {
    for (const [method, path] of [
      ['get', '/api/admin/content'],
      ['put', '/api/admin/content'],
      ['get', '/api/admin/media'],
      ['get', '/api/admin/messages'],
      ['get', '/api/admin/github/repos?username=octocat'],
    ] as const) {
      const res = await api.request[method](path);
      expect(res.status(), `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  test('wrong password is rejected, right password returns a token', async ({ api }) => {
    const bad = await api.request.post('/api/admin/login', { data: { password: 'not-the-password' } });
    expect(bad.status()).toBe(401);
    expect(await bad.json()).toEqual({ error: 'Incorrect password' });

    const good = await api.request.post('/api/admin/login', { data: { password: ADMIN_PASSWORD } });
    expect(good.status()).toBe(200);
    expect((await good.json()).token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('forged / garbage tokens are rejected', async ({ api }) => {
    for (const token of ['garbage', 'a.b.c', '']) {
      const res = await api.request.get('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } });
      expect(res.status()).toBe(401);
    }
  });
});

test.describe('API: content validation & publishing', () => {
  test('rejects javascript: links (XSS via href)', async ({ api }) => {
    const { content } = await api.getContent();
    content.profile.cvUrl = 'javascript:alert(1)';
    const res = await api.putContent(content);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  test('rejects an invalid email and malformed JSON', async ({ api }) => {
    const { content } = await api.getContent();
    content.profile.email = 'nope';
    expect((await api.putContent(content)).status()).toBe(400);

    const res = await api.request.put('/api/admin/content', {
      headers: { Authorization: `Bearer ${api.token}`, 'Content-Type': 'application/json' },
      data: '{"profile":',
    });
    expect(res.status()).toBe(400);
  });

  test('a valid edit is stored, revisioned and served publicly', async ({ api }) => {
    const before = (await api.getContent()).revision;
    const { content } = await api.getContent();
    content.profile.phone = '+8801000000000';
    const res = await api.putContent(content);
    expect(res.status()).toBe(200);
    expect((await res.json()).revision).toBeGreaterThan(before);
    expect((await api.publicContent()).profile.phone).toBe('+8801000000000');
  });

  test('reset restores the defaults', async ({ api }) => {
    const { content } = await api.getContent();
    content.profile.name = 'Changed';
    await api.putContent(content);
    await api.request.post('/api/admin/content/reset', { headers: { Authorization: `Bearer ${api.token}` } });
    expect((await api.publicContent()).profile.name).toBe('Shuvo Kumar Das');
  });
});

test.describe('API: live updates (SSE)', () => {
  test('connected clients receive a snapshot, then every published edit', async ({ api }) => {
    const controller = new AbortController();
    const received: string[] = [];

    const response = await fetch(`${API_URL}/api/content/stream`, { signal: controller.signal });
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const pump = (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          received.push(decoder.decode(value));
        }
      } catch {
        // aborted at the end of the test
      }
    })();

    await expect.poll(() => received.join('')).toContain('event: content');

    const { content } = await api.getContent();
    content.hero.tagline = 'SSE-LIVE-' + Date.now();
    await api.putContent(content);
    await expect.poll(() => received.join('')).toContain(content.hero.tagline);

    controller.abort();
    await pump;
  });
});

test.describe('API: media uploads', () => {
  test('stores a PNG and serves identical bytes with the right headers', async ({ api }) => {
    const res = await upload(api.request, api.token, PNG_BYTES, 'image/png', 'pixel.png');
    expect(res.status()).toBe(201);
    const meta = await res.json();
    expect(meta.url).toBe(`/api/media/${meta.id}`);

    const file = await api.request.get(meta.url);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toBe('image/png');
    expect(file.headers()['x-content-type-options']).toBe('nosniff');
    expect(file.headers()['cache-control']).toContain('immutable');
    expect(Buffer.from(await file.body()).equals(PNG_BYTES)).toBe(true);
  });

  test('accepts PDFs (CV upload)', async ({ api }) => {
    const res = await upload(api.request, api.token, PDF_BYTES, 'application/pdf', 'cv.pdf');
    expect(res.status()).toBe(201);
  });

  test('rejects fake images, HTML and SVG by content, not by name', async ({ api }) => {
    expect((await upload(api.request, api.token, Buffer.from('MZ-not-an-image'), 'image/png', 'evil.png')).status()).toBe(415);
    expect((await upload(api.request, api.token, Buffer.from('<script>alert(1)</script>'), 'text/html', 'x.html')).status()).toBe(415);
    expect((await upload(api.request, api.token, Buffer.from('<svg onload=alert(1)/>'), 'image/svg+xml', 'x.svg')).status()).toBe(415);
  });

  test('deleted media returns 404', async ({ api }) => {
    const meta = await (await upload(api.request, api.token, PNG_BYTES, 'image/png', 'gone.png')).json();
    const del = await api.request.delete(`/api/admin/media/${meta.id}`, { headers: { Authorization: `Bearer ${api.token}` } });
    expect(del.status()).toBe(204);
    expect((await api.request.get(meta.url)).status()).toBe(404);
  });
});

test.describe('API: contact form & inbox', () => {
  test('validates input', async ({ api }) => {
    const res = await api.request.post('/api/contact', { data: { name: 'A', email: 'bad', message: 'x' } });
    expect(res.status()).toBe(400);
  });

  test('stores a message that the admin can read and delete', async ({ api }) => {
    const res = await api.request.post('/api/contact', { data: { name: 'Tester', email: 'tester@example.com', message: 'Hello from the API test' } });
    expect(res.status()).toBe(201);

    const headers = { Authorization: `Bearer ${api.token}` };
    const { items } = (await (await api.request.get('/api/admin/messages', { headers })).json()) as { items: any[] };
    expect(items[0]).toMatchObject({ name: 'Tester', email: 'tester@example.com', message: 'Hello from the API test' });

    expect((await api.request.delete(`/api/admin/messages/${items[0].id}`, { headers })).status()).toBe(204);
    expect(((await (await api.request.get('/api/admin/messages', { headers })).json()) as any).items).toHaveLength(0);
  });
});

test.describe('API: GitHub import input safety', () => {
  test('rejects usernames that are not valid GitHub logins (no outbound request made)', async ({ api }) => {
    const headers = { Authorization: `Bearer ${api.token}` };
    for (const username of ['bad name!', '../../etc/passwd', '-leading-hyphen', 'a'.repeat(40)]) {
      const res = await api.request.get(`/api/admin/github/repos?username=${encodeURIComponent(username)}`, { headers });
      expect(res.status(), username).toBe(400);
    }
  });
});

test.describe('API: CORS', () => {
  test('foreign origins get no CORS headers; the app origin does', async ({ api }) => {
    const evil = await api.request.fetch('/api/content', { headers: { Origin: 'https://evil.example' } });
    expect(evil.headers()['access-control-allow-origin']).toBeUndefined();
    expect(evil.status()).toBe(200); // never a 500

    const ok = await api.request.fetch('/api/content', { headers: { Origin: 'http://127.0.0.1:8180' } });
    expect(ok.headers()['access-control-allow-origin']).toBe('http://127.0.0.1:8180');
  });
});
