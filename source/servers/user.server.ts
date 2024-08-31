import { ExpressRequest, createApp } from "../server";
import { validateEnv, USER_PORT } from "../config/env.config";
import { bindUserRoutes } from "../util/useRoutes";
import Logger from "../util/logger";
import { initDatabase } from "../util/mongo";
import { Namespaces } from "../constants/namespace.constant";
import * as redis from "../services/redis.service";
import {
    DiscordTaskConsumer,
    RecurringInvestmentTaskConsumer,
} from "../services/queues/consumer.service";
import { PayoutCronJob, RecurringCronJob } from "../jobs";

const logger = new Logger("general", Namespaces.USER_SERVER);

const name = "Keble User Service";

export const init = () => createApp(name, bindUserRoutes);

(async function starters(req: ExpressRequest) {
    validateEnv();
    initDatabase();
    await PayoutCronJob(req);
    await RecurringCronJob(req);
    redis;
    DiscordTaskConsumer();
    RecurringInvestmentTaskConsumer();

    init().listen(USER_PORT, () => {
        logger.info(`User Server started successfully on ${USER_PORT}`);
    });
})({} as ExpressRequest);
