import { env } from '@/config/env';
import { defaultContent } from '@/lib/default-content';
import type { SiteContent } from '@/types/content';
import { deepMerge } from '@/lib/merge';
import { http } from './http';

/** Fills anything missing or mistyped (at any depth) from the built-in defaults, so the UI can never crash on a partial document. */
export const withDefaults = (incoming: unknown): SiteContent => deepMerge(defaultContent, incoming);

export async function fetchContent(): Promise<SiteContent> {
  const data = await http<{ content: SiteContent }>('/content');
  return withDefaults(data.content);
}

/**
 * Subscribes to live content updates (Server-Sent Events). The browser reconnects automatically after
 * network drops. If the server refuses the stream for good (e.g. a connection cap, EventSource then
 * gives up) we fall back to polling once a minute, so updates still arrive. Returns an unsubscribe function.
 */
export function subscribeToContent(onContent: (content: SiteContent) => void): () => void {
  if (!env.apiUrl || typeof EventSource === 'undefined') return () => undefined;

  let pollTimer: number | undefined;
  const source = new EventSource(`${env.apiUrl}/content/stream`);

  source.addEventListener('content', (event) => {
    try {
      const { content } = JSON.parse((event as MessageEvent<string>).data) as { content?: SiteContent };
      if (content?.profile) onContent(withDefaults(content));
    } catch {
      // Ignore malformed frames; the next update will recover.
    }
  });

  source.addEventListener('error', () => {
    // CONNECTING = the browser is retrying by itself. CLOSED = it gave up, so poll instead.
    if (source.readyState === EventSource.CLOSED && pollTimer === undefined) {
      pollTimer = window.setInterval(() => {
        fetchContent().then(onContent).catch(() => undefined);
      }, env.pollFallbackMs);
    }
  });

  return () => {
    source.close();
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
  };
}
