import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSseHub } from './lib/sse.js';
import { redis } from './lib/redis.js';
import { getContent } from './services/content.service.js';

async function main() {
  // Fail fast with a clear message if Redis is unreachable.
  await redis.ping();
  await getContent(); // seeds defaults on first run

  const stopHub = startSseHub();
  const server = createApp().listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    stopHub();
    server.close(() => {
      redis.quit().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] failed to start:', error instanceof Error ? error.message : error);
  console.error('Is Redis running? Try: docker compose up -d redis');
  process.exit(1);
});
