// Importing the Schema object from Mongoose
import { Schema } from 'mongoose';

// Defining the WebhookSchema as a Mongoose Schema with properties platform, action, webhook_id and data
export const WebhookSchema: Schema = new Schema(
  {
    platform: {
      type: String,
    },
    action: {
      type: String,
    },
    webhook_id: {
      type: String,
    },
    data: {
      type: Object,
    },
  },
  // Including timestamps in the Schema
  { timestamps: true }
);
