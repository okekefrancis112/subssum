import { Types } from 'mongoose';

export interface CreateOtpDto {
  admin_id?: Types.ObjectId;
  user_id?: Types.ObjectId;
  token?: Object;
  otp: number;
  expires_in: Date;
}
