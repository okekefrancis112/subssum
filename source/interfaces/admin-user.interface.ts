// Import the Document type and Types namespace from the mongoose package
import { Document, Types } from 'mongoose';

// An interface representing a user of the admin panel
export interface IAdminUser {
  // Optional first name
  first_name?: string;
  // Optional last name
  last_name?: string;
  // Optional email address
  email?: string;
  // Optional password
  password?: string;
  // The role of the user
  role: Types.ObjectId;
  // Date of the first login
  first_login?: Date;
  // Date of the last login
  last_login?: Date;
  // Boolean value indicating if the user is disabled or not
  is_disabled?: boolean;
  // Token used to reset the password
  reset_password_token?: string;
  // Expiration date for the reset password token
  reset_password_expires?: Date;
  // Boolean value indicating if the email is verified or not
  verified_email?: boolean;
  // Date of the email verification
  verified_email_at?: Date;
  // Phone number
  phone_number?: string;
  // Profile picture
  profile_photo?: string;
  // Boolean value indicating if two factor authentication is enabled
  is_two_fa?: boolean;
  // Invitation token
  invitation_token?: string;
  // Expiration date of the invitation token
  invitation_expires?: Date;
}

// A document type combining IAdminUser and Document interfaces
export interface IAdminUserDocument extends Document, IAdminUser {}
