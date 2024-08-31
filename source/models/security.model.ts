//importing mongoose and a Schema from mongoose
import mongoose, { Schema } from 'mongoose';
import { SECURITY_TYPE } from '../interfaces/otp.interface';

//Creating the Security Schema
export const SecuritySchema: Schema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    type: {
      type: String,
      enum: Object.values(SECURITY_TYPE),
    },

    entity: {
      type: String,
    },

    generated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },

    used: {
      type: Boolean,
      default: false,
    },

    expired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
