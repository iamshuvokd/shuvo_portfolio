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
    content.projects = null; // makes the Projects section throw while rendering
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
