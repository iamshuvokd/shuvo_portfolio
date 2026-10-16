import type { Response } from 'express';
import { createSubscriber, keys } from './redis.js';

/**
 * Fan-out of Redis pub/sub messages to browsers over Server-Sent Events.
 * Because the source of truth is the Redis channel (not in-process state), this works
 * unchanged with several backend instances behind a load balancer.
 */
const clients = new Set<Response>();

export function addSseClient(res: Response, initial?: unknown) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering (nginx)
  });
  res.write('retry: 3000\n\n');
  if (initial !== undefined) res.write(`event: content\ndata: ${JSON.stringify(initial)}\n\n`);

  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function startSseHub() {
  const subscriber = createSubscriber();

  subscriber.subscribe(keys.channel).catch((error) => console.error('[sse] subscribe failed', error));
  subscriber.on('message', (_channel, raw) => {
    let event: { type: string; revision: number; content: unknown };
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    const payload = `event: ${event.type}\ndata: ${JSON.stringify({ revision: event.revision, content: event.content })}\n\n`;
    for (const client of clients) client.write(payload);
  });

  // Comment-line heartbeat keeps idle connections alive through proxies.
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': ping\n\n');
  }, 25_000);

  return () => {
    clearInterval(heartbeat);
    for (const client of clients) client.end();
    clients.clear();
    subscriber.disconnect();
  };
}

export const connectedClients = () => clients.size;
