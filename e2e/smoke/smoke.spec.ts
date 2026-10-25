import { expect, test } from '@playwright/test';

// Read-only checks that prove a deployment is actually serving the site correctly.

test('API is healthy and Redis is connected', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', redis: true });
});

test('home page renders its content with a clean console (no JS errors, no CSP violations)', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_(INTERNET|NAME|CONNECTION)/.test(text)) problems.push(`console: ${text}`);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  await expect(page.locator('#projects')).toBeAttached();
  await expect(page.locator('#contact')).toBeAttached();
  await page.waitForTimeout(2000); // let lazy chunks (3D scene) and the live stream connect
  expect(problems, problems.join('\n')).toEqual([]);
});

test('security headers are set on the page', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['referrer-policy']).toBeTruthy();
  expect(headers['server'] ?? '').not.toMatch(/\d/); // no version numbers leaked
});

test('caching: hashed assets are immutable, index.html is never cached', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const asset = html.match(/\/assets\/[\w.-]+\.js/)?.[0];
  expect(asset, 'index.html should reference a built asset').toBeTruthy();

  expect((await request.get(asset!)).headers()['cache-control']).toContain('immutable');
  expect((await request.get('/')).headers()['cache-control']).toContain('no-cache');
});

test('deep links fall back to the app, and unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/definitely-not-a-page');
  await expect(page.getByText('Oops! Page not found')).toBeVisible();
});

test('social preview image is published and the page points at it', async ({ page, request }) => {
  await page.goto('/');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toMatch(/og-image\.jpg$/);
  const res = await request.get('/og-image.jpg');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/jpeg');
});

test('live updates: the stream is not buffered by the proxies in front of the API', async ({ baseURL }) => {
  const controller = new AbortController();
  const response = await fetch(`${baseURL}/api/content/stream`, { signal: controller.signal });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  // The first event (the current content) must arrive immediately, not after a proxy buffer fills.
  const reader = response.body!.getReader();
  const first = await Promise.race([
    reader.read().then(({ value }) => new TextDecoder().decode(value)),
    new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000)),
  ]);
  controller.abort();
  expect(first).not.toBe('TIMEOUT');
  expect(first).toContain('retry:');
});

test('admin API is protected', async ({ request }) => {
  expect((await request.get('/api/admin/content')).status()).toBe(401);
  expect((await request.put('/api/admin/content', { data: {} })).status()).toBe(401);
  expect((await request.get('/api/admin/media')).status()).toBe(401);
});

test('admin login works (when SMOKE_ADMIN_PASSWORD is provided)', async ({ page }) => {
  const password = process.env.SMOKE_ADMIN_PASSWORD;
  test.skip(!password, 'SMOKE_ADMIN_PASSWORD not set');

  await page.goto('/admin');
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Site admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click(); // leave no live session behind
  await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
});
