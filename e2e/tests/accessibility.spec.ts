import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';

/** Runs axe-core (WCAG 2.0/2.1 A + AA rules) and fails with a readable list of violations. */
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  const summary = results.violations.map((v) => `[${v.impact}] ${v.id} x${v.nodes.length}: ${v.help} (e.g. ${v.nodes[0]?.html.slice(0, 100)})`);
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

/** Scroll the page so every lazily revealed section is rendered before scanning. */
async function revealEverything(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

test.describe('Accessibility (axe-core)', () => {
  test('public site has no violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await revealEverything(page);
    await expectNoViolations(page, 'public site');
  });

  test('admin login has no violations', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    await expectNoViolations(page, 'admin login');
  });

  test('admin dashboard (several tabs) has no violations', async ({ page, signIn }) => {
    await signIn(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Site admin' })).toBeVisible();
    for (const tab of ['Profile & CV', 'Hero', 'Projects', 'Skills', 'Media', 'JSON']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.waitForTimeout(300);
      await expectNoViolations(page, `admin tab: ${tab}`);
    }
  });

  test('B16: the admin has exactly one main landmark', async ({ page, signIn }) => {
    await page.goto('/admin');
    await expect(page.locator('main')).toHaveCount(1);
    await signIn(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Site admin' })).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('B17: keyboard users get a skip link as the very first stop, and it works', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Tab');

    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible(); // only visible while focused

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('B18: the header avatar is decorative (no duplicate announcement of the name)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header img').first()).toHaveAttribute('alt', '');
  });

  test('every interactive control has an accessible name', async ({ page, signIn }) => {
    await signIn(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Site admin' })).toBeVisible();
    await page.getByRole('tab', { name: 'Projects', exact: true }).click();
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => !(el as HTMLElement).hidden && (el as HTMLInputElement).type !== 'hidden' && (el as HTMLInputElement).type !== 'file')
        .filter((el) => {
          const label = el.getAttribute('aria-label') || (el as HTMLElement).innerText?.trim() || el.getAttribute('title') || (el as HTMLInputElement).labels?.length;
          return !label;
        })
        .map((el) => el.outerHTML.slice(0, 90)),
    );
    expect(unnamed).toEqual([]);
  });
});
