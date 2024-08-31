// mongoose is used to create a database model
import mongoose, { Schema } from 'mongoose';


// ExchangeRateSchema here refers to the database schema for ExchangeRates
export const PersonalizeMessageSchema: Schema = new Schema(
  {

    // morning_message stores the morning message sent to users
    morning_message: {
      type: String,
    },

    // afternoon_message stores the afternoon message sent to users
    afternoon_message: {
        type: String,
    },

    // evening_message stores the evening message sent to users
    evening_message: {
      type: String,
    },

    // Define the default status
    is_default: {
      type: Boolean,
      default: false,
    },

    // this points to the admin user who creates the personalize messages
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },
  },

  // timestamps adds two fields - createdAt and updatedAt into our schema, which will be automatically managed by mongoose.
  { timestamps: true }
);
