import { createApp } from '../server';
import { validateEnv } from '../config/env.config';
import { ADMIN_PORT } from '../config/env.config';
import { bindAdminRoutes } from '../util/useRoutes';
import Logger from '../util/logger';
import { initDatabase } from '../util/mongo';
import { Namespaces } from '../constants/namespace.constant';
import {
  seedDefaultAdminRole,
  seedDefaultTechnicalAdminUser,
  seedPermissions,
  seedSuperAdminRole,
  seedTechnicalAdminRole,
} from '../default';

const name = 'subssum Admin Service';

const init = () => createApp(name, bindAdminRoutes);
const logger = new Logger('general', Namespaces.ADMIN_SERVER);

(async () => {
  validateEnv();

  initDatabase();

  init().listen(ADMIN_PORT, () => {
    logger.info(`Admin Server started successfully on ${ADMIN_PORT}`);
  });

  // await seedPermissions();
  // await seedTechnicalAdminRole();
  // await seedSuperAdminRole();
  // await seedDefaultAdminRole();
  // await seedDefaultTechnicalAdminUser();
})();
