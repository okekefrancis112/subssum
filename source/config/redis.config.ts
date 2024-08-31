import { REDIS_PORT, REDIS_HOST, REDIS_PASSWORD } from "../config/env.config";

// redis config type

type IRedisConfigType = {
    retry_strategy?: any;
    port: number;
    host: string;
    auth_pass?: string;
    reconnectOnError?: any;
    password?: any;
    maxRetriesPerRequest?: any;
    enableReadyCheck?: any;
};

// redis retry strategy config
const redis_config: IRedisConfigType = {
    retry_strategy: function (options: any) {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        if (options.error && options.error.code === "ECONNREFUSED")
            return new Error("The server refused the connection");
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        if (options.total_retry_time > 1000 * 60 * 60)
            return new Error("Retry time exhausted");
        // End reconnecting with built in error
        if (options.attempt > 10) return undefined;
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    },
    host: String(REDIS_HOST),
    port: Number(REDIS_PORT),
    // password: String(REDIS_PASSWORD),
};

export default { redis_config };
