import { Worker } from "bullmq";
import redis from "../../config/redis.config";
import { Webhook, MessageBuilder } from "discord-webhook-node";
import userRepository from "../../repositories/user.repository";
import { Types } from "mongoose";
import { paystackApiClient } from "../../integrations/paystackApiClient";

export const DiscordTaskConsumer = () => {
    const worker = new Worker(
        "discord-queue",
        async (job) => {
            const { title, message, channel_link } = job.data;
            const hook = new Webhook(channel_link);
            const embed = new MessageBuilder()
                .setTitle(`${title}`)
                .setAuthor("subssum 2.0", "", "")
                .setDescription(`${message}`)
                .setColor(27478)
                .setThumbnail(
                    "https://staging.subssum.co/svgs/subssum-logo-black.svg"
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
