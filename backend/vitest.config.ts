import { defineConfig } from 'vitest/config';

// Backend tests run in-process against a throwaway Redis database (14), never database 0.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false, // files share one Redis database
    testTimeout: 15_000,
    hookTimeout: 15_000,
    env: {
      NODE_ENV: 'test',
      PORT: '4300',
      REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379/14',
      ADMIN_PASSWORD: 'unit-test-admin-password',
      JWT_SECRET: 'unit-test-jwt-secret-0123456789-abcdef',
      CORS_ORIGINS: 'http://localhost:8080',
      GITHUB_TOKEN: '',
    },
  },
});
