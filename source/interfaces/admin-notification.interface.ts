//Imports the mongoose Document, and Types interfaces to use in this code
import { Document, Types } from 'mongoose';

// Enum of notification categories

export enum INotificationCategory {
  TRANSACTION = 'transaction',
  LISTING = 'listing',
  INVESTMENT = 'investment',
  SAVING = 'saving',
  REFERRAL = 'referral',
  WALLET = 'wallet',
  BANK = 'bank',
  ACCESS = 'access',
  USER = 'user',
  CARD = 'card',
  PLAN = 'plan',
  LEARN = "learn"
}

// Enum of user categories
export enum INotificationUserCategory {
  ALL = 'all-users',
  SPECIFIC = 'specific-users',
  INVESTED = 'invested-users',
  NON_INVESTED = 'non-invested-users',
  KYC_NOT_COMPLETED = 'kyc-not-completed-users',
}

//Declaring an enum to store notification statuses - UNREAD and READ
export enum INotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

//An interface to define the admin notification
export interface IAdminNotification {
  category: string; //Notification category
  user_id: string; //Notification users
  title: string; //Notification title
  content: any; //Notification content
  action_link: string; //Notification link for more details
  status?: INotificationStatus; //Status of the notification (optional)
  user_category?: INotificationUserCategory; //Users of the notification (optional)
  created_by: Types.ObjectId; //Value of type ObjectId for the creator of the notification
}

//An interface to create a document containing admin notificiation information
export interface IAdminNotificationDocument extends Document, IAdminNotification {}
