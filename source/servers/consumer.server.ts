import cron from 'node-cron';
import { createApp } from '../server';
import { CONSUMER_PORT, validateEnv } from '../config/env.config';
import { USER_PORT } from '../config/env.config';
import { bindUserRoutes } from '../util/useRoutes';
import Logger from '../util/logger';
import { initDatabase } from '../util/mongo';
import { Namespaces } from '../constants/namespace.constant';
import * as redis from '../services/redis.service';
import {
  AdminNotificationTaskConsumer,
  DiscordTaskConsumer,
  NotificationTaskConsumer,
} from '../services/queues/consumer.service';

const logger = new Logger('general', Namespaces.CONSUMER_SERVER);

const name = 'Keble User Service';

export const init = () => createApp(name, bindUserRoutes);

(async () => {
  validateEnv();
  initDatabase();

  redis;

  DiscordTaskConsumer();
  AdminNotificationTaskConsumer();
  NotificationTaskConsumer();

  init().listen(CONSUMER_PORT, () => {
    logger.info(`Consumer started successfully on ${CONSUMER_PORT}`);
  });
})();
