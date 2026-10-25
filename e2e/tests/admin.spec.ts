import type { Page } from '@playwright/test';
import { ADMIN_PASSWORD, TOKEN_KEY } from './support/env';
import { expect, PDF_BYTES, PNG_BYTES, test, toast, trackErrors } from './support/fixtures';

const publish = async (page: Page) => {
  await page.getByRole('button', { name: /Save & publish/ }).click();
  await expect(toast(page, 'Your changes are live on the site now.')).toBeVisible();
  // The header flips back to "published" only once THIS save finished (a toast from an earlier save could still be on screen).
  await expect(page.getByText('All changes published')).toBeVisible();
};

const openTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();

test.describe('Admin: sign in', () => {
  test('shows the login form and rejects a wrong password', async ({ page }) => {
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();

    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Incorrect password');
    await expect(page.getByRole('heading', { name: 'Site admin' })).toHaveCount(0);
  });

  test('signs in, signs out, and keeps the dashboard private afterwards', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Site admin' })).toBeVisible();
    await expect(page.getByText('All changes published')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save & publish/ })).toBeDisabled(); // nothing to save yet

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)).toBeNull();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('an expired or forged session falls back to the login form', async ({ page }) => {
    await page.addInitScript((key) => sessionStorage.setItem(key, 'forged.token.value'), TOKEN_KEY);
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
  });
});

test.describe('Admin: live editing', () => {
  test.beforeEach(async ({ page, signIn }) => {
    await signIn(page);
  });

  test('an edit shows as unsaved, stays private until published, then updates an open public tab with no reload', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await expect(site.getByRole('heading', { level: 1 })).toContainText('Shuvo');

    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Hero');
    const tagline = `Live edit ${Date.now()}`;
    await page.getByLabel('Tagline').fill(tagline);

    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await expect(site.locator('#home')).not.toContainText(tagline); // draft is private

    await publish(page);
    await expect(page.getByText('All changes published')).toBeVisible();
    await expect(site.locator('#home')).toContainText(tagline); // pushed live over SSE, no reload
  });

  test('Ctrl+S publishes', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Hero');

    const badge = `Shortcut ${Date.now()}`;
    await page.getByLabel('Top badge').fill(badge);
    await page.keyboard.press('Control+s');
    await expect(toast(page, 'Your changes are live on the site now.')).toBeVisible();
    await expect(site.locator('#home')).toContainText(badge);
  });

  test('profile details (phone, email, location) flow to the footer and contact section', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls

    await page.getByLabel('Phone').fill('+8801700000000');
    await page.getByLabel('Location').fill('Dhaka, Bangladesh');
    await publish(page);

    await expect(site.locator('footer a[href="tel:+8801700000000"]')).toBeVisible();
    await expect(site.locator('#contact')).toContainText('Dhaka, Bangladesh');
  });

  test('adds, edits and removes a project', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Projects');

    await page.getByRole('button', { name: 'Add project' }).click();
    await page.getByLabel('Title', { exact: true }).last().fill('Playwright Test Project');
    await page.getByLabel('Tech stack').last().fill('Playwright, TypeScript');
    await page.getByLabel('Code link (GitHub)').last().fill('https://github.com/example/playwright-test');
    await publish(page);

    const card = site.locator('#projects article', { hasText: 'Playwright Test Project' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('TypeScript');

    // remove it again
    await page.locator('section', { hasText: 'The first project is shown as the large featured card' }).getByRole('button', { name: 'Remove' }).last().click();
    await publish(page);
    await expect(site.locator('#projects article', { hasText: 'Playwright Test Project' })).toHaveCount(0);
  });

  test('clearing a project link removes its button instead of leaving a dead one', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    const card = site.locator('#projects article', { hasText: 'AI Chatbot' });
    await expect(card.getByRole('button', { name: 'Code' })).toHaveCount(1);

    await page.goto('/admin');
    await page.bringToFront();
    await openTab(page, 'Projects');
    await page.getByLabel('Code link (GitHub)').first().fill('');
    await page.getByLabel('Project / demo link').first().fill('');
    await publish(page);

    await expect(card.getByRole('button', { name: 'Code' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'View Project' })).toHaveCount(0);
    await expect(card).toContainText('AI Chatbot'); // the project itself stays
  });

  test('reordering projects changes the order on the site', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await expect(site.locator('#projects h3').first()).toContainText('AI Chatbot');

    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Projects');
    await page.getByRole('button', { name: 'Move down' }).first().click();
    await publish(page);

    await expect(site.locator('#projects h3').first()).toContainText('Guest Management');
  });

  test('rejects an unsafe link and keeps the site unchanged', async ({ page, context, api }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls

    await page.getByLabel('GitHub', { exact: true }).fill('javascript:alert(1)');
    await page.getByRole('button', { name: /Save & publish/ }).click();

    await expect(toast(page, 'Save failed')).toBeVisible();
    await expect(page.getByText('Unsaved changes')).toBeVisible(); // still a draft
    expect((await api.publicContent()).profile.social.github).toBe('https://github.com/iamshuvokd');
  });

  test('Raw JSON edits apply to the form and publish', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'JSON');

    const box = page.locator('textarea.font-mono');
    const json = JSON.parse(await box.inputValue());
    json.about.heading = 'Edited from raw JSON';
    await box.fill(JSON.stringify(json, null, 2));
    await page.getByRole('button', { name: 'Apply to form' }).click();
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    await publish(page);
    await expect(site.locator('#about')).toContainText('Edited from raw JSON');
  });

  test('invalid JSON is reported, not applied', async ({ page }) => {
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'JSON');
    await page.locator('textarea.font-mono').fill('{ not json');
    await page.getByRole('button', { name: 'Apply to form' }).click();
    await expect(page.locator('p.text-destructive')).toBeVisible();
    await expect(page.getByText('Unsaved changes')).toHaveCount(0);
  });

  test('Reset restores the built-in defaults on the live site', async ({ page, context, api }) => {
    const content = (await api.getContent()).content;
    content.profile.name = 'Temporary Name';
    await api.putContent(content);

    const site = await context.newPage();
    await site.goto('/');
    await expect(site.locator('footer')).toContainText('Temporary Name');

    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(toast(page, 'Content restored to defaults.')).toBeVisible();
    await expect(site.locator('footer')).toContainText('Shuvo Kumar Das');
  });
});

test.describe('Admin: files (CV, photo, media library)', () => {
  test.beforeEach(async ({ page, signIn }) => {
    await signIn(page);
  });

  test('uploading a CV PDF updates the Download CV button on the live site', async ({ page, context, api }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls

    await page.locator('section', { hasText: 'CV / Resume' }).locator('input[type=file]').setInputFiles({ name: 'my-cv.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES });
    await expect(toast(page, /my-cv\.pdf is ready/)).toBeVisible();
    const cvUrl = await page.getByLabel('CV file or link').inputValue();
    expect(cvUrl).toMatch(/^\/api\/media\/[\w-]+$/);

    await publish(page);
    await expect.poll(async () => (await api.publicContent()).profile.cvUrl).toBe(cvUrl);

    const [cvPage] = await Promise.all([context.waitForEvent('page'), site.getByRole('button', { name: 'Download CV' }).click()]);
    await cvPage.waitForURL(new RegExp(cvUrl.replace(/[/]/g, '\\/')));
    const res = await api.request.get(cvUrl);
    expect(res.headers()['content-type']).toBe('application/pdf');
  });

  test('uploading a profile photo replaces it across the site', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls

    await page.locator('section', { hasText: 'Identity' }).locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG_BYTES });
    await expect(toast(page, /me\.png is ready/)).toBeVisible();
    await publish(page);

    await expect(site.locator('header img').first()).toHaveAttribute('src', /\/api\/media\//);
    await expect(site.locator('#about aside img')).toHaveAttribute('src', /\/api\/media\//);
  });

  test('media library: upload, list, and delete (with confirmation)', async ({ page }) => {
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Media');

    await page.locator('input[type=file]').setInputFiles({ name: 'library.png', mimeType: 'image/png', buffer: PNG_BYTES });
    const item = page.locator('ul li', { hasText: 'library.png' });
    await expect(item).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await item.getByRole('button', { name: 'Delete' }).click();
    await expect(item).toHaveCount(0);
  });

  test('a disguised file is rejected with a clear message', async ({ page }) => {
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Media');
    await page.locator('input[type=file]').setInputFiles({ name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('MZ not really a png') });
    await expect(toast(page, 'Upload failed')).toBeVisible();
    await expect(page.locator('ul li', { hasText: 'evil.png' })).toHaveCount(0);
  });
});

test.describe('Admin: messages inbox', () => {
  test('shows visitor messages and lets you delete them', async ({ page, signIn, api }) => {
    await api.request.post('/api/contact', { data: { name: 'Ada Lovelace', email: 'ada@example.com', message: '<b>Hello</b> from the inbox test' } });
    await signIn(page);
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Messages');

    const message = page.locator('ul li', { hasText: 'Ada Lovelace' });
    await expect(message).toBeVisible();
    await expect(message.getByRole('link', { name: 'ada@example.com' })).toHaveAttribute('href', 'mailto:ada@example.com');
    // message bodies are rendered as text, never as HTML
    await expect(message).toContainText('<b>Hello</b> from the inbox test');
    await expect(message.locator('b')).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await message.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No messages yet.')).toBeVisible();
  });
});

test.describe('Admin: import projects from GitHub', () => {
  const repos = [
    { id: 1, name: 'Guest_Management_System', fullName: 'iamshuvokd/Guest_Management_System', description: 'Already on the site', language: 'Power Apps', topics: [], stars: 1, forks: 0, homepage: '', htmlUrl: 'https://github.com/iamshuvokd/Guest_Management_System', pushedAt: '2025-01-01T00:00:00Z', fork: false, archived: false },
    { id: 2, name: 'smart-chef-planner', fullName: 'iamshuvokd/smart-chef-planner', description: 'Plans meals with AI', language: 'TypeScript', topics: ['ai', 'meal-planning'], stars: 7, forks: 1, homepage: 'https://chef.example.com', htmlUrl: 'https://github.com/iamshuvokd/smart-chef-planner', pushedAt: '2025-06-01T00:00:00Z', fork: false, archived: false },
    { id: 3, name: 'forked-lib', fullName: 'iamshuvokd/forked-lib', description: 'A fork', language: 'Go', topics: [], stars: 0, forks: 0, homepage: '', htmlUrl: 'https://github.com/iamshuvokd/forked-lib', pushedAt: '2024-01-01T00:00:00Z', fork: true, archived: false },
  ];

  test.beforeEach(async ({ page, signIn }) => {
    await signIn(page);
    // Mocked: the suite must not depend on GitHub's availability or rate limit.
    await page.route('**/api/admin/github/repos*', (route) => route.fulfill({ json: { items: repos } }));
  });

  test('lists repos, marks existing ones, and publishes a selected repo as a project', async ({ page, context }) => {
    const site = await context.newPage();
    await site.goto('/');

    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Projects');
    await expect(page.getByLabel('GitHub username')).toHaveValue('iamshuvokd'); // prefilled from the profile

    await page.getByRole('button', { name: 'Load repositories' }).click();
    const list = page.locator('ul', { hasText: 'smart-chef-planner' });
    await expect(list.locator('li', { hasText: 'Guest_Management_System' })).toContainText('Added');
    await expect(list.locator('li', { hasText: 'forked-lib' })).toHaveCount(0); // forks hidden by default

    await list.locator('li', { hasText: 'smart-chef-planner' }).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Add 1 selected as projects' }).click();

    // imported with data mapped from the repo
    await expect(page.getByLabel('Title', { exact: true }).last()).toHaveValue('Smart Chef Planner');
    await expect(page.getByLabel('Project / demo link').last()).toHaveValue('https://chef.example.com');
    await expect(page.getByLabel('Tech stack').last()).toHaveValue('TypeScript, Ai, Meal Planning');

    await expect(site.locator('#projects')).not.toContainText('Smart Chef Planner'); // not live yet
    await publish(page);
    await expect(site.locator('#projects article', { hasText: 'Smart Chef Planner' })).toContainText('Plans meals with AI');
  });

  test('forks can be revealed and the list can be filtered', async ({ page }) => {
    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Projects');
    await page.getByRole('button', { name: 'Load repositories' }).click();

    await page.getByLabel('Hide forks').uncheck();
    await expect(page.locator('ul li', { hasText: 'forked-lib' })).toBeVisible();

    await page.getByLabel('Filter repositories').fill('chef');
    await expect(page.locator('ul li', { hasText: 'smart-chef-planner' })).toBeVisible();
    await expect(page.locator('ul li', { hasText: 'forked-lib' })).toHaveCount(0);
  });

  test('a GitHub error is shown to the admin without breaking the page', async ({ page }) => {
    await page.unroute('**/api/admin/github/repos*');
    await page.route('**/api/admin/github/repos*', (route) => route.fulfill({ status: 404, json: { error: 'GitHub user "nobody" was not found.' } }));

    await page.goto('/admin');
    await page.bringToFront(); // a 2nd tab pushes this one to the background, where rAF (and Playwright's stability check) stalls
    await openTab(page, 'Projects');
    await page.getByLabel('GitHub username').fill('nobody');
    await page.getByRole('button', { name: 'Load repositories' }).click();

    await expect(toast(page, 'GitHub error')).toBeVisible();
    await expect(toast(page, /was not found/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add project' })).toBeVisible(); // editor still works
  });
});

test.describe('B9: footer clock shows exactly the location you set', () => {
  test('no hard-coded city is prepended', async ({ page, context, signIn, api }) => {
    await signIn(page);
    const site = await context.newPage();
    await site.goto('/');
    await page.goto('/admin');
    await page.bringToFront();

    await page.getByLabel('Location').fill('London, United Kingdom');
    await page.getByLabel('Time zone (IANA)').fill('Europe/London');
    await publish(page);

    const clock = site.locator('footer section', { hasText: 'Local Time' });
    await expect(clock).toContainText('London, United Kingdom');
    await expect(clock).not.toContainText('Dhaka');
    expect((await api.publicContent()).profile.timeZone).toBe('Europe/London');
  });
});

test.describe('B6: conflicting edits are never overwritten silently', () => {
  test('warns when someone else published first; Cancel keeps their version, OK overwrites', async ({ page, signIn, api }) => {
    await signIn(page);
    await page.goto('/admin');
    await openTab(page, 'Hero');
    await page.getByLabel('Tagline').fill('My edit (older revision)');

    // Meanwhile another admin (or tab) publishes a change.
    const other = (await api.getContent()).content;
    other.hero.tagline = 'Their edit (newer)';
    expect((await api.putContent(other)).status()).toBe(200);

    // First attempt: the admin declines to overwrite.
    let message = '';
    page.once('dialog', (dialog) => {
      message = dialog.message();
      void dialog.dismiss();
    });
    await page.getByRole('button', { name: /Save & publish/ }).click();
    await expect(toast(page, 'Not saved')).toBeVisible();
    expect(message).toContain('changed by someone else');
    expect((await api.publicContent()).hero.tagline).toBe('Their edit (newer)');
    await expect(page.getByText('Unsaved changes')).toBeVisible(); // work is kept, not lost

    // Second attempt: the admin chooses to overwrite.
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: /Save & publish/ }).click();
    await expect(page.getByText('All changes published')).toBeVisible();
    expect((await api.publicContent()).hero.tagline).toBe('My edit (older revision)');

    // After a successful save the editor tracks the new revision: next save needs no prompt.
    await page.getByLabel('Tagline').fill('Follow-up edit');
    await publish(page);
    expect((await api.publicContent()).hero.tagline).toBe('Follow-up edit');
  });
});

test.describe('B19: deleting files the live site uses', () => {
  test('asks twice before breaking the live site, and the cleanup button keeps used files', async ({ page, signIn, api }) => {
    await signIn(page);
    // an upload that the live site uses, and one nobody uses
    const form = (name: string) => ({ file: { name, mimeType: 'image/png', buffer: PNG_BYTES } });
    const headers = { Authorization: `Bearer ${api.token}` };
    const used = await (await api.request.post('/api/admin/media', { headers, multipart: form('in-use.png') })).json();
    await api.request.post('/api/admin/media', { headers, multipart: form('orphan.png') });
    const { content } = await api.getContent();
    content.profile.photoUrl = used.url;
    await api.putContent(content);

    await page.goto('/admin');
    await openTab(page, 'Media');
    await expect(page.locator('ul li', { hasText: 'in-use.png' })).toContainText('in use');

    // Cleanup (age threshold is 1 hour in the UI, so brand-new files are protected)
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Clean up unused' }).click();
    await expect(toast(page, 'Nothing to clean up')).toBeVisible();

    // Deleting the in-use file: first confirm, then a second warning
    const messages: string[] = [];
    page.on('dialog', (dialog) => {
      messages.push(dialog.message());
      void dialog.accept();
    });
    await page.locator('ul li', { hasText: 'in-use.png' }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('ul li', { hasText: 'in-use.png' })).toHaveCount(0);
    expect(messages).toHaveLength(2);
    expect(messages[1]).toContain('used on the live site');
  });
});
