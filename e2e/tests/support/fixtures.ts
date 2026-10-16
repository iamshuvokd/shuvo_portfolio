import { expect, request as playwrightRequest, test as base, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_PASSWORD, API_URL, TOKEN_KEY } from './env';

/** Minimal typed client for the backend, used to seed and clean state outside the browser. */
export class AdminApi {
  constructor(
    readonly request: APIRequestContext,
    readonly token: string,
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async getContent() {
    const res = await this.request.get('/api/admin/content', { headers: this.headers });
    expect(res.ok()).toBeTruthy();
    return (await res.json()) as { content: any; revision: number };
  }

  async putContent(content: unknown) {
    return this.request.put('/api/admin/content', { headers: this.headers, data: content });
  }

  async publicContent() {
    return ((await (await this.request.get('/api/content')).json()) as { content: any }).content;
  }

  /** Back to a known state: default content, no uploads, empty inbox. */
  async resetAll() {
    await this.request.post('/api/admin/content/reset', { headers: this.headers });

    const media = (await (await this.request.get('/api/admin/media', { headers: this.headers })).json()) as { items: { id: string }[] };
    for (const item of media.items) await this.request.delete(`/api/admin/media/${item.id}`, { headers: this.headers });

    const messages = (await (await this.request.get('/api/admin/messages', { headers: this.headers })).json()) as { items: { id: string }[] };
    for (const item of messages.items) await this.request.delete(`/api/admin/messages/${item.id}`, { headers: this.headers });
  }
}

interface Fixtures {
  api: AdminApi;
  /** Signs a page in by seeding the session token, skipping the login form (covered by its own test). */
  signIn: (page: Page) => Promise<void>;
}

export const test = base.extend<Fixtures & { _clean: void }>({
  api: async ({}, use) => {
    const request = await playwrightRequest.newContext({ baseURL: API_URL });
    const res = await request.post('/api/admin/login', { data: { password: ADMIN_PASSWORD } });
    expect(res.ok(), 'admin login for test setup').toBeTruthy();
    const { token } = (await res.json()) as { token: string };
    await use(new AdminApi(request, token));
    await request.dispose();
  },

  // Runs before every test: guarantees a clean, known starting state.
  _clean: [
    async ({ api }, use) => {
      await api.resetAll();
      await use();
    },
    { auto: true },
  ],

  signIn: async ({ api }, use) => {
    await use(async (page) => {
      await page.addInitScript(([key, token]) => sessionStorage.setItem(key, token), [TOKEN_KEY, api.token]);
    });
  },
});

export { expect };

/**
 * A visible toast. Radix renders each toast as `li[data-state=open]` plus a hidden screen-reader copy,
 * so plain getByText() would match both and trip Playwright's strict mode.
 */
export const toast = (page: Page, text: string | RegExp) => page.locator('li[data-state="open"]').getByText(text);

/** Collects uncaught exceptions and console errors so tests can assert the page is clean. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Third-party font / network hiccups are not app bugs.
    if (/Failed to load resource|fonts\.(googleapis|gstatic)|ERR_(INTERNET|NAME|CONNECTION)/i.test(text)) return;
    errors.push(`console.error: ${text}`);
  });
  return errors;
}

/** 1x1 transparent PNG. */
export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Minimal bytes that pass the backend's %PDF- signature check. */
export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
