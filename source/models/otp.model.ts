//importing mongoose and a Schema from mongoose
import mongoose, { Schema } from 'mongoose';

//Creating the OTP Schema
export const OtpSchema: Schema = new Schema(
  {
    //Adding field for OTP
    otp: {
      type: Number,
    },

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

    //Adding field for admin ID
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },

    token: {
      type: String,
    },

    //Adding field for expiration time
    expires_in: {
      type: Date,
    },
  },
  { timestamps: true }
);
