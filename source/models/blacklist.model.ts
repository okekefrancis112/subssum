//importing mongoose and a Schema from mongoose
import mongoose, { Schema } from 'mongoose';
import { IBlackListCategory } from '../interfaces/user.interface';

export const BlacklistSchema: Schema = new Schema(
  {
    //Adding field for user ID
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    user: {
      first_name: String,
      last_name: String,
      email: String,
    },

    is_disabled: {
      type: Boolean, //Data Type for Is Disabled
      default: false, //Default value set to false
    },

    can_withdraw: {
      type: Boolean,
      default: true,
    },

    can_send_to_friend: {
      type: Boolean,
      default: true,
    },

    can_invest: {
      type: Boolean,
      default: true,
    },

    can_refer: {
      type: Boolean,
      default: true,
    },

    blacklist_category: {
      type: String,
      enum: Object.values(IBlackListCategory),
    },

    blacklist_reason: {
      type: String,
    },
  },
  { timestamps: true }
);
