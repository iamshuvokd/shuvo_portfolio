import { randomUUID } from 'node:crypto';
import { keys, redis } from '../lib/redis.js';

export interface MediaMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
}

/**
 * Magic-byte checks, so a renamed .exe/.html cannot pass as an image or PDF.
 * SVG is excluded on purpose (it can carry scripts).
 */
const signatures: Record<string, (b: Buffer) => boolean> = {
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/gif': (b) => b.subarray(0, 4).toString('ascii') === 'GIF8',
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
};

export const allowedMime = Object.keys(signatures);

export const isValidFile = (mime: string, data: Buffer) => Boolean(signatures[mime]?.(data));

export async function saveMedia(data: Buffer, mime: string, originalName: string): Promise<MediaMeta> {
  const meta: MediaMeta = {
    id: randomUUID(),
    name: originalName.replace(/[^\w.\- ]/g, '_').slice(0, 120) || 'file',
    mime,
    size: data.length,
    createdAt: Date.now(),
  };

  await redis
    .multi()
    .set(keys.media(meta.id), data)
    .set(keys.mediaMeta(meta.id), JSON.stringify(meta))
    .zadd(keys.mediaIndex, meta.createdAt, meta.id)
    .exec();

  return meta;
}

export async function getMedia(id: string): Promise<{ meta: MediaMeta; data: Buffer } | null> {
  const [metaRaw, data] = await Promise.all([redis.get(keys.mediaMeta(id)), redis.getBuffer(keys.media(id))]);
  if (!metaRaw || !data) return null;
  return { meta: JSON.parse(metaRaw) as MediaMeta, data };
}

export async function listMedia(): Promise<MediaMeta[]> {
  const ids = await redis.zrevrange(keys.mediaIndex, 0, -1);
  if (!ids.length) return [];
  const raws = await redis.mget(ids.map(keys.mediaMeta));
  return raws.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as MediaMeta);
}

export async function deleteMedia(id: string): Promise<void> {
  await redis.multi().del(keys.media(id), keys.mediaMeta(id)).zrem(keys.mediaIndex, id).exec();
}
