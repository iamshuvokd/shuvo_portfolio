/**
 * Typed, centralised access to environment variables.
 * Only `VITE_`-prefixed variables are exposed to the browser — never put secrets here.
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const env = {
  /**
   * Backend API base. In development it defaults to `/api` (proxied to the backend by Vite).
   * In production set VITE_API_URL (e.g. https://api.example.com/api); empty = static content only.
   */
  apiUrl: configuredApiUrl ?? (import.meta.env.DEV ? '/api' : ''),
  /** How often to poll when the live stream is refused. Overridable so tests need not wait a minute. */
  pollFallbackMs: Number(import.meta.env.VITE_POLL_FALLBACK_MS) || 60_000,
  emailjs: {
    serviceId: (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? 'service_5kjhg5i',
    templateId: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? 'template_q7bmc9d',
    publicKey: (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? '_o1jAcCqmDodGrhHt',
  },
} as const;

/**
 * Uploaded files are stored as `/api/media/<id>`. If the API lives on another origin,
 * prefix that origin so <img src> and download links still resolve.
 */
export function assetUrl(path: string): string {
  if (!path || !path.startsWith('/api/') || !/^https?:\/\//.test(env.apiUrl)) return path;
  return new URL(env.apiUrl).origin + path;
}
