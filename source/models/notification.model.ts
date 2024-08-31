//Importing mongoose and the Schema interface from 'mongoose'
import mongoose, { Schema } from 'mongoose';
//Importing Interface for Notification Category and Status
import { INotificationCategory, INotificationStatus } from '../interfaces/notification.interface';

//Creating the Notification Schema
export const NotificationSchema: Schema = new Schema(
  {
    //The User ID field referencing to the User Model
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    //The title of the notification
    title: {
      type: String,
      required: true,
    },

    //The category of the notification pulled from the imported Enum
    notification_category: {
      type: String,
      enum: Object.values(INotificationCategory),
    },

    //The content of the notification
    content: {
      type: Object,
    },

    //The link to get more action of the notification
    action_link: {
      type: String,
    },

    //The status of the notification pulled from the imported Enum with a default value
    status: {
      type: String,
      enum: Object.values(INotificationStatus),
      default: INotificationStatus.UNREAD,
    },
  },
  { timestamps: true }
);
