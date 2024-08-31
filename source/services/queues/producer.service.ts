import { Queue } from "bullmq";
import redis from "../../config/redis.config";

const redisOption = redis.redis_config;

// new QueueScheduler('discord-queue', { connection: redis });
const discordQueue = new Queue("discord-queue", {
    connection: redisOption,
});

export const DiscordTaskJob = async (job: any) => {
    await discordQueue.add(job.name, job.data);
};

// notification
const notificationQueue = new Queue("notification-queue", {
    connection: redisOption,
});

export const NotificationTaskJob = async (job: any) => {
    await notificationQueue.add(job.name, job.data, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 3000,
        },
    });
};

// notification
const adminNotificationQueue = new Queue("admin-notification-queue", {
    connection: redisOption,
});

export const AdminNotificationTaskJob = async (job: any) => {
    await adminNotificationQueue.add(job.name, job.data, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 3000,
        },
    });
};

// deletion
const assetDeletionQueue = new Queue("delete-queue", {
    connection: redisOption,
});

export const DeletionTaskJob = async (job: any) => {
    await assetDeletionQueue.add(job.name, job.data, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 3000,
        },
    });
};

// Recurring Investment Charge
const recurringInvestmentChargeQueue = new Queue("recurring-investment-queue", {
    connection: redisOption,
});

export const RecurringInvestmentTaskJob = async (job: any) => {
    await recurringInvestmentChargeQueue.add(job.name, job.data);
};
