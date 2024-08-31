// import mongoose library
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
}

// Enum of user categories
export enum INotificationUserCategory {
  ALL = 'all-users',
  SPECIFIC = 'specific-users',
  INVESTED = 'invested-users',
  NON_INVESTED = 'non-invested-users',
  KYC_COMPLETED = 'kyc-completed-users',
  KYC_NOT_COMPLETED = 'kyc-not-completed-users',
}

// Enum of notification statuses
export enum INotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

// Interface of the notification
export interface INotification {
  user: Types.ObjectId;
  title: string;
  notification_category: INotificationCategory;
  content: any;
  action_link: string;
  status?: INotificationStatus;
}

// Interface of the notification document
export interface INotificationDocument extends Document, INotification {}
