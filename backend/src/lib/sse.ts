import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { createSubscriber, keys } from './redis.js';

/**
 * Fan-out of Redis pub/sub messages to browsers over Server-Sent Events.
 * Because the source of truth is the Redis channel (not in-process state), this works
 * unchanged with several backend instances behind a load balancer.
 */
const clients = new Set<Response>();
const perIp = new Map<string, number>();

/**
 * Each open stream costs a socket and memory, so one machine (or the whole server) cannot open unlimited ones.
 * Returns false (after answering 429) when a cap is hit.
 */
export function addSseClient(req: Request, res: Response, initial?: unknown): boolean {
  const ip = req.ip ?? 'unknown';
  if (clients.size >= env.SSE_MAX_TOTAL || (perIp.get(ip) ?? 0) >= env.SSE_MAX_PER_IP) {
    res.status(429).set('Retry-After', '30').json({ error: 'Too many live connections. Close other tabs and retry.' });
    return false;
  }
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering (nginx)
  });
  res.write('retry: 3000\n\n');
  if (initial !== undefined) res.write(`event: content\ndata: ${JSON.stringify(initial)}\n\n`);

  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
    const left = (perIp.get(ip) ?? 1) - 1;
    if (left <= 0) perIp.delete(ip);
    else perIp.set(ip, left);
  });
  return true;
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
