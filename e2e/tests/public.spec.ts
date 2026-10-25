import { expect, test, toast, trackErrors } from './support/fixtures';

test.describe('Public site', () => {
  test('renders every section from live content without errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Hi, I.m\s*Shuvo/);
    for (const heading of ['Professional Journey', 'Featured Projects', 'Skills & Expertise', 'Start a conversation']) {
      await expect(page.getByRole('heading', { name: heading })).toBeAttached();
    }
    await expect(page.locator('footer')).toContainText('Shuvo Kumar Das');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('shows the seeded projects with working GitHub links', async ({ page, context }) => {
    await context.route('https://github.com/**', (route) => route.fulfill({ body: 'stub', contentType: 'text/html' }));
    await page.goto('/');

    const titles = page.locator('#projects h3');
    await expect(titles).toHaveCount(4);
    await expect(titles.first()).toContainText('AI Chatbot');

    await page.locator('#projects').scrollIntoViewIfNeeded();
    const card = page.locator('#projects article', { hasText: 'Guest Management Solution' });
    await card.scrollIntoViewIfNeeded();

    const [newPage] = await Promise.all([context.waitForEvent('page'), card.getByRole('button', { name: 'Code' }).click()]);
    await newPage.waitForURL(/github\.com\/iamshuvokd\/Guest_Management_System/);
  });

  test('header navigation scrolls to sections and tracks the active one', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });

    await nav.getByRole('button', { name: 'Skills' }).click();
    await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('#skills')!.getBoundingClientRect().top))).toBeLessThan(200);
    await expect(nav.getByRole('button', { name: 'Skills' })).toHaveAttribute('aria-current', 'true');
  });

  test('mobile menu opens, navigates and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle menu' }).click();
    const mobileNav = page.getByRole('navigation', { name: 'Mobile' });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole('button', { name: 'Contact' }).click();
    await expect(mobileNav).toBeHidden();
    await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('#contact')!.getBoundingClientRect().top))).toBeLessThan(200);
  });

  test('stays fully usable when the backend is unreachable (offline fallback)', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());
    const errors = trackErrors(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Hi, I.m\s*Shuvo/);
    await expect(page.locator('#projects h3')).toHaveCount(4);
    expect(errors.filter((e) => e.startsWith('pageerror')), errors.join('\n')).toEqual([]);
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page.getByText('Oops! Page not found')).toBeVisible();
  });

  test('has a social preview image and tags', async ({ page, request }) => {
    await page.goto('/');
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/og-image\.jpg$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');

    const res = await request.get('/og-image.jpg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
    // WhatsApp ignores preview images much larger than ~300 KB.
    expect((await res.body()).length).toBeLessThan(300 * 1024);
  });

  test('robots.txt keeps /admin away from EVERY crawler (named groups do not inherit the * group)', async ({ request, page }) => {
    const robots = await (await request.get('/robots.txt')).text();

    // Parse into groups the way crawlers do: consecutive User-agent lines open a group, rules follow.
    const groups: { agents: string[]; rules: string[] }[] = [];
    for (const line of robots.split(String.fromCharCode(10)).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)) {
      const [field, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (field.toLowerCase() === 'user-agent') {
        const last = groups[groups.length - 1];
        if (last && last.rules.length === 0) last.agents.push(value);
        else groups.push({ agents: [value], rules: [] });
      } else groups[groups.length - 1]?.rules.push(`${field.toLowerCase()}:${value}`);
    }

    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.rules, `group for ${group.agents.join(', ')}`).toContain('disallow:/admin');
      expect(group.rules).not.toContain('disallow:/'); // the public site stays crawlable
    }

    await page.goto('/admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('Contact form', () => {
  test('sends a message that lands in the admin inbox', async ({ page, api }) => {
    await page.goto('/');
    await page.getByPlaceholder('Your name').fill('Playwright Visitor');
    await page.getByPlaceholder('you@example.com').fill('visitor@example.com');
    await page.getByPlaceholder(/Tell me about your project/).fill('Hello from the contact form test');
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(toast(page, 'Message sent successfully')).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toHaveValue(''); // form resets

    const { items } = (await (await api.request.get('/api/admin/messages', { headers: { Authorization: `Bearer ${api.token}` } })).json()) as { items: any[] };
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Playwright Visitor', email: 'visitor@example.com', message: 'Hello from the contact form test' });
  });

  test('shows a friendly error when the server rejects the message', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.fulfill({ status: 429, json: { error: 'Too many messages, please try again in a minute.' } }));
    await page.goto('/');
    await page.getByPlaceholder('Your name').fill('Spammer');
    await page.getByPlaceholder('you@example.com').fill('spam@example.com');
    await page.getByPlaceholder(/Tell me about your project/).fill('Hi');
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(toast(page, 'Message failed')).toBeVisible();
  });
});
