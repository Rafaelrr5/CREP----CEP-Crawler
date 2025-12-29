import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisEnabled = process.env.REDIS_ENABLED !== 'false';

export const getRedisClient = (): Redis | null => {
  if (!redisEnabled) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });

    redisClient.on('error', (err) => {
      logger.warn({ err }, 'Redis connection error');
    });

    redisClient.connect().catch((err) => {
      logger.warn({ err }, 'Failed to connect to Redis');
    });

    logger.info({ redisUrl }, 'Redis client configured');
  } catch (error) {
    logger.warn({ err: error }, 'Failed to initialize Redis client');
    redisClient = null;
  }

  return redisClient;
};

export default getRedisClient;
