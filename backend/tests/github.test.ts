import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadApp } from './helpers.js';

let listGithubRepos: typeof import('../src/services/github.service.js').listGithubRepos;
let redis: Awaited<ReturnType<typeof loadApp>>['redis'];

const raw = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `repo-${id}`,
  full_name: `octo/repo-${id}`,
  description: null,
  language: null,
  topics: [],
  stargazers_count: 0,
  forks_count: 0,
  homepage: null,
  html_url: `https://github.com/octo/repo-${id}`,
  pushed_at: '2025-01-01T00:00:00Z',
  fork: false,
  archived: false,
  private: false,
  ...extra,
});

/** Fakes GitHub: `pages` full pages of 100 repos, then a short last page of `rest` repos. */
function mockGithub(pages: number, rest = 0) {
  const fetchMock = vi.fn(async (url: string) => {
    const page = Number(new URL(url).searchParams.get('page'));
    const count = page <= pages ? 100 : page === pages + 1 ? rest : 0;
    const start = (page - 1) * 100;
    return new Response(JSON.stringify(Array.from({ length: count }, (_, i) => raw(start + i))), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeAll(async () => {
  ({ redis } = await loadApp());
  ({ listGithubRepos } = await import('../src/services/github.service.js'));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await redis.flushdb();
});
afterAll(async () => {
  await redis.quit();
});

describe('GitHub repo listing', () => {
  it('is not truncated for a normal account', async () => {
    mockGithub(0, 40);
    const result = await listGithubRepos('octo');
    expect(result.items).toHaveLength(40);
    expect(result.truncated).toBe(false);
  });

  it('flags truncation when the account has more repos than the 300 we fetch', async () => {
    const fetchMock = mockGithub(5); // every page is full: there are more than we will ever fetch
    const result = await listGithubRepos('octo');
    expect(result.items).toHaveLength(300);
    expect(result.truncated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3); // stops at the cap instead of paging forever
  });

  it('exactly 300 repos that end on a short page is not flagged', async () => {
    mockGithub(2, 0); // 200 repos then an empty page
    expect((await listGithubRepos('octo')).truncated).toBe(false);
  });

  it('serves the second call from the Redis cache (protects the rate limit)', async () => {
    const fetchMock = mockGithub(0, 5);
    await listGithubRepos('octo');
    await listGithubRepos('octo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hides private repositories and keeps only web homepages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([raw(1), raw(2, { private: true }), raw(3, { homepage: 'javascript:alert(1)' }), raw(4, { homepage: 'https://ok.example' })]), { status: 200 })),
    );
    const { items } = await listGithubRepos('octo');
    expect(items.map((r) => r.name)).toEqual(['repo-1', 'repo-3', 'repo-4']);
    expect(items.find((r) => r.name === 'repo-3')?.homepage).toBe('');
    expect(items.find((r) => r.name === 'repo-4')?.homepage).toBe('https://ok.example');
  });

  it('maps GitHub errors to clear messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    await expect(listGithubRepos('ghost-user')).rejects.toMatchObject({ status: 404 });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
    await expect(listGithubRepos('limited')).rejects.toMatchObject({ status: 429 });
    await expect(listGithubRepos('bad name!')).rejects.toMatchObject({ status: 400 });
  });
});
