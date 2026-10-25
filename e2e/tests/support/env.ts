export const API_PORT = 4100;
export const WEB_PORT = 8180;
export const API_URL = `http://127.0.0.1:${API_PORT}`;
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

/** Database 15 keeps test data completely separate from development (database 0). */
export const REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6379/15';

export const ADMIN_PASSWORD = 'e2e-Xk9-mQ2-vL7-pR4z-test';

/** Must match TOKEN_KEY in frontend/src/services/admin.service.ts. */
export const TOKEN_KEY = 'portfolio:admin-token';
