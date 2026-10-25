import 'dotenv/config';
import { z } from 'zod';
import { weakPasswordReason } from '../lib/password-policy.js';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  /** Password for the /admin panel. */
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
  /** Secret used to sign admin session tokens. Use a long random string. */
  JWT_SECRET: z.string().min(24, 'JWT_SECRET must be at least 24 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default('http://localhost:8080'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(8),
  /** Max admin login attempts per IP per 15 min. Keep low in production; raised for automated tests. */
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  /** Max public read requests (content, media...) per IP per minute. Health checks and the live stream are exempt. */
  PUBLIC_RATE_LIMIT: z.coerce.number().int().positive().default(300),
  /** Max simultaneous live-update (SSE) connections from one IP, and across the whole server. */
  SSE_MAX_PER_IP: z.coerce.number().int().positive().default(25), // generous: offices/campuses share one IP
  SSE_MAX_TOTAL: z.coerce.number().int().positive().default(1000),
  /** Max contact-form submissions per IP per minute. */
  CONTACT_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  /** Optional. Raises the GitHub API limit from 60 to 5000 requests/hour. Needs no scopes for public repos. */
  GITHUB_TOKEN: z.string().optional(),
});

const parsed = schema
  .superRefine((value, ctx) => {
    // In production a weak admin password is a startup error, not a suggestion.
    const reason = value.NODE_ENV === 'production' ? weakPasswordReason(value.ADMIN_PASSWORD) : null;
    if (reason) ctx.addIssue({ code: 'custom', path: ['ADMIN_PASSWORD'], message: `too weak for production: ${reason}` });
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'development') {
  const reason = weakPasswordReason(parsed.data.ADMIN_PASSWORD);
  if (reason) console.warn(`[security] ADMIN_PASSWORD is weak (${reason}). Fine locally, but production will refuse to start with it.`);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
