import { randomUUID } from 'node:crypto';
import { keys, redis } from '../lib/redis.js';
import type { ContactInput } from '../schemas/content.js';

export interface StoredMessage extends ContactInput {
  id: string;
  createdAt: number;
}

const MAX_MESSAGES = 500;

export async function addMessage(input: ContactInput): Promise<StoredMessage> {
  const message: StoredMessage = { ...input, id: randomUUID(), createdAt: Date.now() };

  await redis
    .multi()
    .hset(keys.messages, message.id, JSON.stringify(message))
    .zadd(keys.messageOrder, message.createdAt, message.id)
    .exec();

  // Keep Redis bounded: drop the oldest beyond the cap.
  const overflow = (await redis.zcard(keys.messageOrder)) - MAX_MESSAGES;
  if (overflow > 0) {
    const oldest = await redis.zrange(keys.messageOrder, '0', String(overflow - 1));
    await redis
      .multi()
      .hdel(keys.messages, ...oldest)
      .zrem(keys.messageOrder, ...oldest)
      .exec();
  }
  return message;
}

export async function listMessages(): Promise<StoredMessage[]> {
  const ids = await redis.zrevrange(keys.messageOrder, 0, -1);
  if (!ids.length) return [];
  const raws = await redis.hmget(keys.messages, ...ids);
  return raws.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as StoredMessage);
}

export async function deleteMessage(id: string): Promise<void> {
  await redis.multi().hdel(keys.messages, id).zrem(keys.messageOrder, id).exec();
}
