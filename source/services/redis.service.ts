import Redis from 'ioredis';
import Logger from '../util/logger';
import r from '../config/redis.config';

const NAMESPACE = 'REDIS';
const logger = new Logger('redis', NAMESPACE);
const redis = new Redis(r.redis_config);

// emits when a connection is established to the Redis server.
redis.on('connect', () => {
  logger.info(`Client connected to redis...`);
});

/********
 * emits when an error occurs while connecting with a property of lastNodeError representing the last node error received.
 * This event is emitted silently (only emitting if there's at least one listener).
 */
redis.on('error', (e: any) => {
  logger.error(e);
});

/********
 * emits when an established Redis server connection has closed.
 */
redis.on('close', (msg: any) => {
  logger.info(msg);
  logger.info('Redis connection closed');
});

/********************************
 * emits after close when a reconnection will be made. The argument of the event is the time (in ms) before reconnecting.
 */
redis.on('reconnecting', (msg: any) => {
  logger.info(msg);
  logger.info('Redis connection reconnecting');
});

/********
 * emits after close when no more reconnections will be made.
 */

redis.on('end', (msg: any) => {
  logger.info(msg);
  logger.info('Redis reconnection closed');
});

/*********
 * emits when a new node is connected.
 */
redis.on('+node', (msg: any) => {
  logger.info(msg);
  logger.info('New node is connected.');
});

/********
 * emits when a node is disconnected.
 */
redis.on('-node', (msg: any) => {
  logger.info(msg);
  logger.info('New node is disconnected.');
});

redis.on('node error', (msg: any) => {
  logger.info(msg);
  logger.error('error reconnecting to node');
});

/**
 *
 *  Redis Basic Operations
 *
 */

// getting key expiration
const ttl = (key: string) => {
  return new Promise((resolve, reject) => {
    redis.ttl(key, (error: any, exp: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(exp);
      }
    });
  });
};
/** redis set */
const redisSetEx = (key: string, value: any, expiry: number) => {
  return new Promise((resolve, reject) => {
    redis.set(key, value, 'EX', expiry, (error: any) => {
      if (error) {
        return reject(error);
      }
      resolve({ value, expiry });
    });
  });
};

/** redis get */
type voidFn = (value: unknown) => void;
const promiser = (resolve: voidFn, reject: voidFn) => {
  return (err: any, data: any) => {
    if (err) reject(err);
    resolve(data);
  };
};
const redisGet = async (key: any) => {
  return new Promise((resolve, reject) => {
    redis.get(key, promiser(resolve, reject));
  });
};

/** redis delete */
const redisDelete = async (key: string) => {
  try {
    await redis.del(key);
  } catch (e) {
    return Promise.reject(e);
  }
};

export { redisDelete, redisGet, redisSetEx, ttl, redis };
