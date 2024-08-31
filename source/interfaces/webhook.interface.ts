import { Document } from "mongoose";

export enum IAction {
    WEBHOOK_SAVED = "webhook_saved",
}

export interface IWebhook {
    platform: string;
    action: string;
    webhook_id: string;
    data: Record<string, any>;
}

export interface IWebhookDocument extends Document, IWebhook {}
