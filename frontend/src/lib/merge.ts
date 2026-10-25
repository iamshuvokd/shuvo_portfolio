const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Overlays `incoming` on `base`, always returning something shaped like `base`.
 * - objects merge key by key, so a missing nested field is filled from the defaults;
 * - arrays and primitives from `incoming` win, but only if their type matches `base`;
 * - anything of the wrong type (null, a string where an object belongs...) is ignored.
 * Used for cached and server content so an old or partial document can never crash the UI.
 */
export function deepMerge<T>(base: T, incoming: unknown): T {
  if (incoming === undefined || incoming === null) return base;

  if (isPlainObject(base)) {
    if (!isPlainObject(incoming)) return base;
    const merged: Record<string, unknown> = { ...base };
    for (const key of Object.keys(incoming)) {
      merged[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], incoming[key]) : incoming[key];
    }
    return merged as T;
  }

  if (Array.isArray(base)) return (Array.isArray(incoming) ? incoming : base) as T;

  return (typeof incoming === typeof base ? incoming : base) as T;
}
