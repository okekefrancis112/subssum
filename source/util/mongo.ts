import { connect } from 'mongoose';
import { env } from '../config/env.config';

import { MONGO_DB_NAME, MONGO_URL, MONGO_URL_TEST } from '../config/env.config';
import Logger from './logger';
import { Namespaces } from '../constants/namespace.constant';

const logger = new Logger('general', Namespaces.MONGO_DATABASE);

let attempts = 0;

const MONGO_CONNECT_URL = env.isTest ? MONGO_URL_TEST : MONGO_URL;

export const initDatabase = async () =>
  connect(`${MONGO_CONNECT_URL}`, {
    connectTimeoutMS: 20000,
    keepAlive: true,
    socketTimeoutMS: 0,
    dbName: MONGO_DB_NAME,
  })
    .then(({ connection }) => {
      logger.info(
        `Successfully Connected to MongoDB. ${connection.host}:${connection.port}/${connection.db.databaseName}`
      );
    })
    .catch((error) => {
      const nextConnect = ++attempts * (Math.random() * 10000);

      if (attempts >= 5) {
        logger.error('Unable to establish database connection', {
          error,
        });
        process.exit(1);
      }

      logger.error(
        `[Attempt #${attempts}]. Unable to connect to Database (${MONGO_URL}): ${error}. Reconnecting in ${Math.floor(
          nextConnect / 1000
        )} seconds`
      );
      setTimeout(initDatabase, nextConnect);
    });
