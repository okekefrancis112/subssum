// Import Types from Mongoose library
import { Types } from 'mongoose';

// Create an interface to represent Blacklist data structure
export interface IBlacklist {
  user_id: Types.ObjectId;
  user: any;
  blacklist_category: string;
  blacklist_reason?: string;
  is_disabled?: boolean;
  can_withdraw?: boolean;
  can_send_to_friend?: boolean;
  can_invest?: boolean;
  can_refer?: boolean;
}

// Create an interface which combines Document and IBlacklist interface
export interface IBlacklistDocument extends Document, IBlacklist {}
