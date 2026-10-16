import type { SiteContent } from '@/types/content';

/** Trims every string and drops blank entries from string lists, so stray whitespace never reaches the site. */
export function cleanContent<T>(value: T): T {
  if (typeof value === 'string') return value.trim() as T;
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanContent);
    return (cleaned.every((item) => typeof item === 'string') ? cleaned.filter(Boolean) : cleaned) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanContent(item)])) as T;
  }
  return value;
}

export const serializeContent = (content: SiteContent) => JSON.stringify(cleanContent(content));
