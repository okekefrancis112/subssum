import { Worker } from "bullmq";
import redis from "../../config/redis.config";
import { Webhook, MessageBuilder } from "discord-webhook-node";
import adminNotificationRepository from "../../repositories/admin-notification.repository";
import notificationRepository from "../../repositories/notification.repository";
import userRepository from "../../repositories/user.repository";
import { Types } from "mongoose";
import { INotificationUserCategory } from "../../interfaces/admin-notification.interface";
import { paystackApiClient } from "../../integrations/paystackApiClient";

export const DiscordTaskConsumer = () => {
    const worker = new Worker(
        "discord-queue",
        async (job) => {
            const { title, message, channel_link } = job.data;
            const hook = new Webhook(channel_link);
            const embed = new MessageBuilder()
                .setTitle(`${title}`)
                .setAuthor("Keble 2.0", "", "")
                .setDescription(`${message}`)
                .setColor(27478)
                .setThumbnail(
                    "https://staging.keble.co/svgs/keble-logo-black.svg"
                )
                .setTimestamp();
            hook.send(embed);
        },
        { connection: redis.redis_config }
    );

    worker.on("completed", (job) => {
        console.log(`Discord task with job ID of ${job.id} has completed!`);
    });

    worker.on("failed", (job, err) => {
        console.log(
            `Discord task with job ID of ${job?.id} has failed with ${err.message}`
        );
    });
};

export const AdminNotificationTaskConsumer = () => {
    const worker = new Worker(
        "admin-notification-queue",
        async (job) => {
            const {
                category,
                title,
                content,
                action_link,
                user_category,
                created_by,
            } = job.data;

            if (user_category === INotificationUserCategory.INVESTED) {
                const invest = await userRepository.getAllNoPagination({
                    select: "total_amount_invested _id",
                });
                for (let i = 0; i < invest.length; i++) {
                    if (invest[i].total_amount_invested > 0) {
                        await adminNotificationRepository.create({
                            category,
                            user_id: invest[i]._id,
                            title,
                            content,
                            action_link,
                            user_category,
                            created_by,
                        });
                    }
                }
            } else if (
                user_category === INotificationUserCategory.NON_INVESTED
            ) {
                const invest = await userRepository.getAllNoPagination({
                    select: "total_amount_invested _id",
                });

                for (let i = 0; i < invest.length; i++) {
                    if (invest[i].total_amount_invested === 0) {
                        await adminNotificationRepository.create({
                            category,
                            user_id: invest[i]._id,
                            title,
                            content,
                            action_link,
                            user_category,
                            created_by,
                        });
                    }
                }
            } else if (
                user_category === INotificationUserCategory.KYC_NOT_COMPLETED
            ) {
                const kyc = await userRepository.getAllNoPagination({
                    select: "kyc_completed _id",
                });

                for (let i = 0; i < kyc.length; i++) {
                    if (!kyc[i].kyc_completed) {
                        await adminNotificationRepository.create({
                            category,
                            user_id: kyc[i]._id,
                            title,
                            content,
                            action_link,
                            user_category,
                            created_by,
                        });
                    }
                }
            } else if (user_category === INotificationUserCategory.ALL) {
                const all_users = await userRepository.getAllNoPagination({
                    select: "_id",
                });

                for (let i = 0; i < all_users.length; i++) {
                    await adminNotificationRepository.create({
                        category,
                        user_id: all_users[i]._id,
                        title,
                        content,
                        action_link,
                        user_category,
                        created_by,
                    });
                }
            }
        },
        { connection: redis.redis_config }
    );

    worker.on("completed", (job) => {
        console.log(
            `Admin notification task with job ID of ${job.id} has completed!`
        );
    });

    worker.on("failed", (job, err) => {
        console.log(
            `Admin notification task with job ID of ${job?.id} has failed with ${err.message}`
        );
    });
};

export const NotificationTaskConsumer = () => {
    const worker = new Worker(
        "notification-queue",
        async (job) => {
            const {
                notification_category,
                user_id,
                title,
                content,
                action_link,
            } = job.data;
            await notificationRepository.create({
                user_id: new Types.ObjectId(user_id),
                title,
                notification_category,
                content,
                action_link,
            });
        },
        { connection: redis.redis_config }
    );

    worker.on("completed", (job) => {
        console.log(
            `Notification task with job ID of ${job.id} has completed!`
        );
    });

    worker.on("failed", (job, err) => {
        console.log(
            `Notification task with job ID of ${job?.id} has failed with ${err.message}`
        );
    });
};

export const RecurringInvestmentTaskConsumer = () => {
    const worker = new Worker(
        "recurring-investment-queue",
        async (job) => {
            const { investment_payload } = job.data;
            await paystackApiClient.recurringCharge(investment_payload);
        },
        { connection: redis.redis_config }
    );

    worker.on("completed", (job) => {
        console.log(
            `Recurring investment task with job ID of ${job.id} has completed!`
        );
    });

    worker.on("failed", (job, err) => {
        console.log(
            `Recurring investment task with job ID of ${job?.id} has failed with ${err.message}`
        );
    });
};
