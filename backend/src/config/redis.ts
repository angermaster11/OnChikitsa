import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Optional shared Redis client. Created only when REDIS_URL is set — otherwise the
 * app keeps using in-process state (so local dev and single-instance deploys work
 * unchanged). Used by the rate limiter to share its counters across instances.
 *
 * A Redis blip must never take the process down, so we attach an 'error' listener
 * (an ioredis client with no error handler throws on connection errors).
 */
let client: Redis | null = null;
let initialised = false;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (initialised) return client;
  initialised = true;
  const c = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
  });
  c.on('error', (err) => logger.error({ err }, 'Redis client error'));
  c.on('connect', () => logger.info('Redis connected'));
  client = c;
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
    initialised = false;
  }
}
