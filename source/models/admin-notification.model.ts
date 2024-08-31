// Import mongoose and the schema from mongoose
import mongoose, { Schema } from 'mongoose';
// Import the Interface for Admin Notification
import { INotificationCategory, INotificationStatus, INotificationUserCategory } from '../interfaces/admin-notification.interface';

// Create AdminNotificationSchema with Schema object
export const AdminNotificationSchema: Schema = new Schema(
  {
    // Set status as String field with list of enums from INotificationCategory interface
    category: {
      type: String,
      enum: Object.values(INotificationCategory),
    },

    //The User ID field referencing to the User Model
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Set status as String field with list of enums from INotificationUserCategory interface
    user_category: {
      type: String,
      enum: Object.values(INotificationUserCategory),
    },

    // Set title as required String field
    title: {
      type: String,
      required: true,
    },

    // Set content as an Object field
    content: {
      type: Object,
    },

    // Set action link to redirect users to the main page
    action_link: {
      type: String,
    },

    // Set status as String field with list of enums from INotificationStatus interface
    status: {
      type: String,
      enum: Object.values(INotificationStatus),
      default: INotificationStatus.UNREAD,
    },

    // Set the creator of the notification
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },
  },
  // Automatically add time stamps
  { timestamps: true }
);
