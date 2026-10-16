import 'dotenv/config';
import { z } from 'zod';

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
  /** Max contact-form submissions per IP per minute. */
  CONTACT_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  /** Optional. Raises the GitHub API limit from 60 to 5000 requests/hour. Needs no scopes for public repos. */
  GITHUB_TOKEN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
