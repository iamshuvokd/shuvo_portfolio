import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { keys, redis } from '../lib/redis.js';

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  homepage: string;
  htmlUrl: string;
  pushedAt: string;
  fork: boolean;
  archived: boolean;
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  homepage: string | null;
  html_url: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

/** GitHub login rules: alphanumerics and single hyphens, max 39 chars. Also keeps the URL we build safe. */
const USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

const CACHE_SECONDS = 300;
const MAX_PAGES = 3; // up to 300 repos

const toRepo = (raw: RawRepo): GithubRepo => ({
  id: raw.id,
  name: raw.name,
  fullName: raw.full_name,
  description: raw.description ?? '',
  language: raw.language ?? '',
  topics: raw.topics ?? [],
  stars: raw.stargazers_count,
  forks: raw.forks_count,
  // Only keep web URLs; the field is user-controlled text on GitHub.
  homepage: raw.homepage && /^https?:\/\//i.test(raw.homepage) ? raw.homepage : '',
  htmlUrl: raw.html_url,
  pushedAt: raw.pushed_at,
  fork: raw.fork,
  archived: raw.archived,
});

async function fetchPage(username: string, page: number): Promise<RawRepo[]> {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&page=${page}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'portfolio-backend',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new HttpError(502, 'Could not reach GitHub. Check the server internet connection.');
  }

  if (response.status === 404) throw new HttpError(404, `GitHub user "${username}" was not found.`);
  if (response.status === 403 || response.status === 429) {
    throw new HttpError(429, 'GitHub rate limit reached. Wait a few minutes, or set GITHUB_TOKEN in backend/.env.');
  }
  if (!response.ok) throw new HttpError(502, `GitHub returned ${response.status}.`);
  return (await response.json()) as RawRepo[];
}

export interface RepoList {
  items: GithubRepo[];
  /** True when the account has more repositories than we fetch (MAX_PAGES x 100). */
  truncated: boolean;
}

/** Lists a user's public repositories (cached in Redis for 5 minutes to protect the rate limit). */
export async function listGithubRepos(username: string, refresh = false): Promise<RepoList> {
  if (!USERNAME.test(username)) throw new HttpError(400, 'Enter a valid GitHub username.');

  const cacheKey = keys.githubRepos(username);
  if (!refresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as RepoList | GithubRepo[];
      return Array.isArray(parsed) ? { items: parsed, truncated: false } : parsed; // older cache entries were plain arrays
    }
  }

  const raw: RawRepo[] = [];
  let truncated = false;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await fetchPage(username, page);
    raw.push(...batch);
    if (batch.length < 100) break;
    truncated = page === MAX_PAGES; // a full last page means there may be more we did not fetch
  }

  const result: RepoList = { items: raw.filter((repo) => !repo.private).map(toRepo), truncated };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_SECONDS);
  return result;
}
