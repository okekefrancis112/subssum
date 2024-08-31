import winston from "winston";

const dateFormat = () => {
    return new Date(Date.now()).toUTCString();
};

class LoggerService {
    [x: string]: any;
    constructor(route: any, namespace: any = undefined) {
        this.log_data = null;
        this.route = route;
        this.namespace = namespace;
        const logger = winston.createLogger({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize()),
                    level: "info",
                    handleExceptions: true,
                }),
                new winston.transports.File({
                    filename: `./logs/${route}.log`,
                }),
            ],
            format: winston.format.printf((info) => {
                let message = `${dateFormat()} | ${namespace} | ${info.level.toUpperCase()} | ${route}.log | ${
                    info.message
                }`;
                message = info.obj
                    ? message + `data:${JSON.stringify(info.obj)} | `
                    : message;
                message = this.log_data
                    ? message + `log_data:${JSON.stringify(this.log_data)} | `
                    : message;
                return message;
            }),
        });
        this.logger = logger;
    }
    setLogData(log_data: any) {
        this.log_data = log_data;
    }
    async info(message: any, obj: any = undefined) {
        this.logger.log("info", message, { obj });
    }

    async debug(message: any, obj: any = undefined) {
        this.logger.log("debug", message, {
            obj,
        });
    }

    async error(message: any, obj: any = undefined) {
        this.logger.log("error", message, {
            obj,
        });
    }
}

export default LoggerService;
