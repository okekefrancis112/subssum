export interface CreateWebhookDto {
    platform: String;
    action: string;
    webhook_id: string;
    data?: Record<string, any>;
    session?: any;
}
