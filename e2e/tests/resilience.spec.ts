import type { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';

/** Seeds the browser's cached copy of the site content and cuts the API, so the cache is all the page has. */
async function loadWithCachedContent(page: Page, content: unknown) {
  await page.addInitScript((json) => localStorage.setItem('portfolio:content:v1', json), JSON.stringify(content));
  await page.route('**/api/**', (route) => route.abort());
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(1500);
  return pageErrors;
}

test.describe('B1: a bad value can never blank the whole site', () => {
  test('the API rejects an invalid time zone', async ({ api }) => {
    const { content } = await api.getContent();
    content.profile.timeZone = 'Dhaka';
    const res = await api.putContent(content);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('IANA time zone');
  });

  test('the API still accepts real zones', async ({ api }) => {
    const { content } = await api.getContent();
    content.profile.timeZone = 'Europe/London';
    expect((await api.putContent(content)).status()).toBe(200);
  });

  test('the footer falls back safely if an invalid zone ever reaches the browser', async ({ page, api }) => {
    const content = await api.publicContent();
    content.profile.timeZone = 'Dhaka';
    const pageErrors = await loadWithCachedContent(page, content);

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shuvo');
    await expect(page.locator('footer')).toContainText('Local Time');
  });

  test('a section that throws is contained; the rest of the page still renders', async ({ page, api }) => {
    const content = await api.publicContent();
    content.projects.items = [null]; // a list entry that is not an object makes the Projects section throw
    await loadWithCachedContent(page, content);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shuvo');
    await expect(page.locator('#about')).toBeAttached();
    await expect(page.locator('#contact')).toBeAttached();
    await expect(page.locator('footer')).toContainText('Shuvo Kumar Das');
    await expect(page.locator('#projects')).toHaveCount(0); // only the broken section is dropped
  });

  test('the admin form flags an invalid zone before publishing', async ({ page, signIn }) => {
    await signIn(page);
    await page.goto('/admin');
    await page.getByLabel('Time zone (IANA)').fill('Dhaka');
    await expect(page.getByRole('alert').filter({ hasText: 'Not a valid time zone' })).toBeVisible();
    await page.getByLabel('Time zone (IANA)').fill('Asia/Dhaka');
    await expect(page.getByRole('alert').filter({ hasText: 'Not a valid time zone' })).toHaveCount(0);
  });
});

test.describe('B2: old or partial cached content cannot crash the site', () => {
  test('a cached hero without metrics is healed from the defaults', async ({ page }) => {
    const pageErrors = await loadWithCachedContent(page, {
      hero: { badge: 'Old cached badge', greeting: 'Hi', firstName: 'Cached', roles: ['Dev'], tagline: 'Old tagline' },
    });

    expect(pageErrors, pageErrors.join(String.fromCharCode(10))).toEqual([]);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cached'); // cached values still win
    await expect(page.locator('#home')).toContainText('Years building systems'); // missing metrics came from defaults
    await expect(page.locator('#projects h3')).toHaveCount(4);
  });

  test('wrongly typed or null cached sections fall back to defaults', async ({ page }) => {
    const pageErrors = await loadWithCachedContent(page, { projects: null, skills: 'oops', profile: { social: null }, hero: [] });

    expect(pageErrors, pageErrors.join(String.fromCharCode(10))).toEqual([]);
    await expect(page.locator('#projects h3')).toHaveCount(4);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shuvo');
  });

  test('garbage in localStorage is ignored', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('portfolio:content:v1', '{not json'));
    await page.route('**/api/**', (route) => route.abort());
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shuvo');
    expect(pageErrors).toEqual([]);
  });
});

test.describe('B4: very long text cannot break the layout', () => {
  test('long names, titles, descriptions and emails stay inside a phone screen', async ({ page, api }) => {
    const { content } = await api.getContent();
    content.profile.name = 'Shuvo Kumar Das-Chowdhury-Bhattacharya-Mukhopadhyay';
    content.profile.email = `${'e'.repeat(60)}@example.com`;
    content.projects.items[1].title = `${'W'.repeat(60)}Extraordinarylongprojecttitlewithoutanyspaces`;
    content.projects.items[1].description = 'x'.repeat(1900);
    content.projects.items[1].tech = ['T'.repeat(40)];
    content.experience.items[0].company = `Apptriangle${'X'.repeat(70)}`;
    expect((await api.putContent(content)).status()).toBe(200);

    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForTimeout(1200);

      const report = await page.evaluate(() => {
        const limit = window.innerWidth + 1;
        const offenders = ['header > div > div', '#projects article', '#experience article', '#contact h2', '#contact form', 'footer section']
          .flatMap((selector) => [...document.querySelectorAll(selector)].map((el) => ({ selector, right: Math.round(el.getBoundingClientRect().right) })))
          .filter((item) => item.right > limit);
        return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, offenders };
      });

      expect(report.offenders, `${width}px: ${JSON.stringify(report.offenders)}`).toEqual([]);
      expect(report.scrollWidth).toBeLessThanOrEqual(report.innerWidth + 1);
    }
  });

  test('the header keeps one line and shows the name truncated', async ({ page, api }) => {
    const { content } = await api.getContent();
    content.profile.name = 'A'.repeat(100);
    await api.putContent(content);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const height = await page.locator('header > div > div').first().evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(90);
  });
});

test.describe('B7: a refused live stream degrades to polling instead of going stale', () => {
  test('when /content/stream answers 429, the page still picks up published changes by polling', async ({ page, api }) => {
    await page.route('**/api/content/stream', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Too many live connections.' }) }),
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shuvo');

    const { content } = await api.getContent();
    content.hero.tagline = `Delivered by polling ${Date.now()}`;
    await api.putContent(content);

    await expect(page.locator('#home')).toContainText(content.hero.tagline, { timeout: 20_000 });
  });
});
