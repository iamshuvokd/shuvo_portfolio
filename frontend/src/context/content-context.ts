import { createContext } from 'react';
import { defaultContent } from '@/lib/default-content';
import type { SiteContent } from '@/types/content';

export interface ContentContextValue {
  content: SiteContent;
  /** True once the backend has delivered content (as opposed to cache/defaults). */
  isLive: boolean;
}

export const ContentContext = createContext<ContentContextValue>({ content: defaultContent, isLive: false });
