import { env } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Minimal typed JSON client for the backend. Throws ApiError on non-2xx. */
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string; issues?: unknown });
    throw new ApiError(body.error ?? `Request failed: ${response.status} ${response.statusText}`, response.status, body.issues);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
