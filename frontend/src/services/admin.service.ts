import { env } from '@/config/env';
import type { ContactMessage, GithubRepo, MediaItem, SiteContent } from '@/types/content';
import { withDefaults } from './content.service';
import { ApiError } from './http';

const TOKEN_KEY = 'portfolio:admin-token';

/** sessionStorage: the session ends when the tab closes, limiting exposure on shared machines. */
export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const setToken = (token: string) => {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode: session just won't survive a reload
  }
};
export const clearToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(`${env.apiUrl}/admin${path}`, { ...init, headers, body });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; issues?: { path: string; message: string }[] };
    if (response.status === 401 && path !== '/login') clearToken();
    const detail = data.issues?.length ? ` (${data.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join('; ')})` : '';
    throw new ApiError((data.error ?? response.statusText) + detail, response.status, data.issues);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const adminApi = {
  async login(password: string) {
    const { token } = await request<{ token: string }>('/login', { method: 'POST', json: { password } });
    setToken(token);
  },
  /** Revokes the token on the server first, then forgets it locally. Never blocks sign-out when the server is unreachable. */
  async logout() {
    // Start the request first (it reads the token synchronously), then forget the token right away.
    const revoked = request<void>('/logout', { method: 'POST' }).catch(() => undefined); // offline/expired: ignore
    clearToken();
    await revoked;
  },
  verifySession: () => request<{ ok: true }>('/session'),
  async getContent() {
    const data = await request<{ content: SiteContent; revision: number }>('/content');
    return { content: withDefaults(data.content), revision: data.revision };
  },
  /** `revision` = the revision this edit started from; the server answers 409 if someone saved in between. */
  saveContent: (content: SiteContent, revision?: number) =>
    request<{ revision: number }>('/content', {
      method: 'PUT',
      json: content,
      headers: revision === undefined ? undefined : { 'X-Content-Revision': String(revision) },
    }),
  resetContent: () => request<{ revision: number }>('/content/reset', { method: 'POST' }),

  listMedia: async () => (await request<{ items: MediaItem[] }>('/media')).items.map(withUrl),
  uploadMedia(file: File) {
    const form = new FormData();
    form.append('file', file);
    return request<MediaItem>('/media', { method: 'POST', body: form });
  },
  deleteMedia: (id: string, force = false) => request<void>(`/media/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
  /** Deletes uploads that no published content references and that are older than an hour. */
  cleanupMedia: () => request<{ deleted: number }>('/media/cleanup?olderThanMinutes=60', { method: 'POST' }),

  listMessages: async () => (await request<{ items: ContactMessage[] }>('/messages')).items,
  deleteMessage: (id: string) => request<void>(`/messages/${id}`, { method: 'DELETE' }),

  async listGithubRepos(username: string, refresh = false) {
    const query = new URLSearchParams({ username, ...(refresh ? { refresh: '1' } : {}) });
    return (await request<{ items: GithubRepo[] }>(`/github/repos?${query}`)).items;
  },
};

const withUrl = (item: MediaItem): MediaItem => ({ ...item, url: `/api/media/${item.id}` });
