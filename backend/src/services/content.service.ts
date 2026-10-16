import { readFileSync } from 'node:fs';
import { keys, redis } from '../lib/redis.js';
import { contentSchema, type SiteContent } from '../schemas/content.js';

const defaultsUrl = new URL('../../../shared/default-content.json', import.meta.url);
const defaults: SiteContent = contentSchema.parse(JSON.parse(readFileSync(defaultsUrl, 'utf-8')));

export const getDefaultContent = (): SiteContent => structuredClone(defaults);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Overlays stored content on the defaults. Objects merge key by key; arrays and primitives from
 * the stored side win. This way a field added to the schema later is filled from defaults instead
 * of invalidating (and hiding) everything the admin already saved.
 */
function mergeOntoDefaults(base: unknown, stored: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(stored)) {
    const merged: Record<string, unknown> = { ...base };
    for (const key of Object.keys(stored)) merged[key] = mergeOntoDefaults(base[key], stored[key]);
    return merged;
  }
  return stored === undefined ? base : stored;
}

/** Reads live content from Redis, seeding it from the shared defaults on first run. */
export async function getContent(): Promise<{ content: SiteContent; revision: number }> {
  const [raw, rev] = await redis.mget(keys.content, keys.revision);
  const revision = Number(rev ?? 0);

  if (!raw) {
    // NX: if two instances start together, only one seed wins.
    await redis.set(keys.content, JSON.stringify(defaults), 'NX');
    return { content: getDefaultContent(), revision };
  }

  const parsed = contentSchema.safeParse(mergeOntoDefaults(defaults, JSON.parse(raw)));
  if (!parsed.success) {
    console.error('[content] stored content failed validation, serving defaults', parsed.error.issues.slice(0, 3));
    return { content: getDefaultContent(), revision };
  }
  return { content: parsed.data, revision };
}

/** Persists content and notifies every connected server/visitor through Redis pub/sub. */
export async function saveContent(content: SiteContent): Promise<number> {
  const results = await redis.multi().set(keys.content, JSON.stringify(content)).incr(keys.revision).exec();

  const revision = Number(results?.[1]?.[1] ?? 0);
  await redis.publish(keys.channel, JSON.stringify({ type: 'content', revision, content }));
  return revision;
}

export const resetContent = () => saveContent(getDefaultContent());
