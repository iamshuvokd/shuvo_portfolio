import { useEffect, useState, type ReactNode } from 'react';
import { env } from '@/config/env';
import { defaultContent } from '@/lib/default-content';
import { fetchContent, subscribeToContent } from '@/services/content.service';
import type { SiteContent } from '@/types/content';
import { ContentContext } from './content-context';

const CACHE_KEY = 'portfolio:content:v1';

const readCache = (): SiteContent => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...defaultContent, ...(JSON.parse(raw) as Partial<SiteContent>) };
  } catch {
    // storage unavailable or corrupt: fall back to built-in defaults
  }
  return defaultContent;
};

const writeCache = (content: SiteContent) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // ignore quota / privacy-mode errors
  }
};

/**
 * Provides the site content. First paint uses the last-seen content (or built-ins) so there is
 * never a loading flash; then the live API takes over and keeps pushing edits made in /admin.
 */
export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<SiteContent>(readCache);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!env.apiUrl) return;
    let active = true;

    const apply = (next: SiteContent) => {
      if (!active) return;
      setContent(next);
      setIsLive(true);
      writeCache(next);
    };

    fetchContent()
      .then(apply)
      .catch(() => undefined); // backend down: keep cached/default content

    const unsubscribe = subscribeToContent(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return <ContentContext.Provider value={{ content, isLive }}>{children}</ContentContext.Provider>;
};
