import defaults from '@shared/default-content.json';
import type { SiteContent } from '@/types/content';

/**
 * Built-in content. Used instantly on first paint and whenever the backend is
 * unreachable, so the public site never depends on the API being up.
 */
export const defaultContent = defaults as SiteContent;
