// Import Types from Mongoose library
import { Types } from 'mongoose';

export enum SECURITY_TYPE {
  OTP = 'otp',
  SECRET_PASSWORD = 'secret_password',
}

// Create an interface to represent OTP data structure
export interface IOtp {
  // Field for User ID
  user_id?: Types.ObjectId;
  // Field for Admin ID
  admin_id?: Types.ObjectId;
  // Field for OTP value
  otp: number;
  // Field for Token
  token?: string;
  // Field for Expiry Date
  expires_in: Date;
}

// Create an interface which combines Document and IOtp interface
export interface IOtpDocument extends Document, IOtp {}
