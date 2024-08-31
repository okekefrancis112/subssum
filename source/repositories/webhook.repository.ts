import { IWebhookDocument } from "../interfaces/webhook.interface";
import { Webhook } from "../models";
import { FilterQuery } from "mongoose";

class WebhookRepository {
    public async create({
        platform,
        action,
        webhook_id,
        data,
        session,
    }: {
        platform: String;
        action: string;
        webhook_id: string;
        data?: Record<string, any>;
        session?: any;
    }): Promise<IWebhookDocument | null | any> {
        const payload = {
            platform,
            action,
            webhook_id,
            data,
        };

        const wallet = await Webhook.create([payload], { session });

        return wallet;
    }

    public async getOne(
        query: FilterQuery<IWebhookDocument>
    ): Promise<IWebhookDocument> {
        return Webhook.findOne(query).exec() as Promise<IWebhookDocument>;
    }
}

export default new WebhookRepository();
