import { Redis } from 'ioredis';
import { env } from '../config/env.js';

function connect(name: string) {
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
  client.on('error', (error) => console.error(`[redis:${name}]`, error.message));
  client.on('ready', () => console.log(`[redis:${name}] ready`));
  return client;
}

/** General-purpose command connection. */
export const redis = connect('main');

/** Pub/Sub needs its own connection: a subscribed client cannot run normal commands. */
export const createSubscriber = () => connect('sub');

export const keys = {
  content: 'portfolio:content',
  revision: 'portfolio:content:rev',
  channel: 'portfolio:events',
  mediaIndex: 'portfolio:media:index',
  media: (id: string) => `portfolio:media:${id}`,
  mediaMeta: (id: string) => `portfolio:media:${id}:meta`,
  messages: 'portfolio:messages',
  messageOrder: 'portfolio:messages:order',
  revokedToken: (jti: string) => `portfolio:revoked:${jti}`,
  githubRepos: (user: string) => `portfolio:github:${user.toLowerCase()}`,
};
