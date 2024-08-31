// import mongoose and Schema from 'mongoose'
import mongoose, { Schema } from 'mongoose';

// create AdminUserchema with properties of first_name, last_name, email and password as String type, role as referenced Object Id, verified_email, verified_email_at, is_disabled, first_login, last_login, last_login_ip, phone_number, profile_photo, is_two_fa, bucket, invitation_token, invitation_expires, reset_password_token and reset_password_expires as Date or Boolean type.
export const AdminUserchema: Schema = new Schema(
  {
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },

    email: {
      index: true,
      lowercase: true,
      type: String,
      required: true,
    },

    password: {
      type: String,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roles',
    },

    verified_email: {
      type: Boolean,
      default: false,
    },

    verified_email_at: Date,

    is_disabled: {
      type: Boolean,
      default: false,
    },
    first_login: {
      type: Boolean,
      required: false,
    },
    last_login: {
      type: Date,
    },
    last_login_ip: {
      type: String,
    },

    phone_number: {
      type: String,
    },

    profile_photo: {
      type: String,
    },

    is_two_fa: {
      type: Boolean,
      default: false,
    },

    bucket: {
      type: String,
    },

    invitation_token: {
      type: String,
    },
    invitation_expires: {
      type: Date,
    },

    reset_password_token: {
      type: String,
    },
    reset_password_expires: {
      type: Date,
    },
  },
  { timestamps: true }
);
