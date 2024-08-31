import { config } from "dotenv";
import Joi, { ObjectSchema } from "joi";
import path from "path";
import Logger from "../util/logger";
config({ path: path.resolve(__dirname, "../../.env") });
import { Namespaces } from "../constants/namespace.constant";

// export const env = (name: string, defaultValue = '') => process.env[name] ?? defaultValue;

// environment
export const env = {
    isDev: String(process.env.NODE_ENV).toLowerCase().includes("development"),
    isTest: String(process.env.NODE_ENV).toLowerCase().includes("test"),
    isProd: String(process.env.NODE_ENV).toLowerCase().includes("production"),
    isStaging: String(process.env.NODE_ENV).toLowerCase().includes("staging"),
    env: process.env.NODE_ENV,
};

export const {
    MAILGUNKEY,
    MAILGUNDOMAIN,
    USER_PORT,
    CONSUMER_PORT,
    ADMIN_PORT,
    MONGO_DB_NAME,
    MONGO_URL,
    MONGO_URL_TEST,
    TOKEN_EXPIRE_TIME,
    SERVER_TOKEN_ISSUER,
    SERVER_TOKEN_SECRET,
    S3_BUCKET_NAME,
    AWS_SECRET,
    AWS_ID,
    PAYSTACK_SECRET_KEY,
    PAYSTACK_BASE_API_URl,
    FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_BASE_API_URI,
    FLUTTERWAVE_SECRET_HASH,
    FLUTTERWAVE_TEST_SECRET_HASH,
    FINCRA_SECRET_KEY,
    FINCRA_BASE_API_URl,
    MONO_SECRET_KEY,
    MONO_BASE_API_URl_CONNECT,
    MONO_BASE_API_URl_DIRECT,
    MONO_KEBLE_WEBHOOK_SECRET,
    REDIS_PORT,
    REDIS_HOST,
    REDIS_PASSWORD,
    // Anchor
    ANCHOR_SECRET_TEST_KEY,
    ANCHOR_TEST_API_URI,
    ANCHOR_LIVE_API_URI,
    ANCHOR_SECRET_TEST_TOKEN,
    TECHNICAL_EMAIL,
    TECHNICAL_PASSWORD,
    TECHNICAL_FIRST_NAME,
    TECHNICAL_LAST_NAME,
    YOU_VERIFY_TEST_API_KEY,
    YOU_VERIFY_LIVE_API_KEY,
    YOU_VERIFY_TEST_URL,
    YOU_VERIFY_LIVE_URL,
    GOOGLE_SECRET_KEY,
} = process.env;

const logger = new Logger("general", Namespaces.MONGO_DATABASE);

const schema = Joi.object({});
const validateAppConfig = (
    schema: ObjectSchema,
    config: Record<string, unknown>
): void => {
    const result = schema.validate(config, {
        abortEarly: false,
        allowUnknown: true,
    });

    if (result.error) {
        logger.error("Application configuration error.", {
            details: result.error.details,
        });

        throw result.error;
    }
};

export const validateEnv = () => {
    try {
        validateAppConfig(schema, process.env);
    } catch (e) {
        console.error("Can't start app. Env config invalid.");
        process.exit(1);
    }
};
