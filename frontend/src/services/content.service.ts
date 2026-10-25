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
 * Subscribes to live content updates (Server-Sent Events). The browser reconnects
 * automatically after network drops. Returns an unsubscribe function.
 */
export function subscribeToContent(onContent: (content: SiteContent) => void): () => void {
  if (!env.apiUrl || typeof EventSource === 'undefined') return () => undefined;

  const source = new EventSource(`${env.apiUrl}/content/stream`);
  source.addEventListener('content', (event) => {
    try {
      const { content } = JSON.parse((event as MessageEvent<string>).data) as { content?: SiteContent };
      if (content?.profile) onContent(withDefaults(content));
    } catch {
      // Ignore malformed frames; the next update will recover.
    }
  });
  return () => source.close();
}
