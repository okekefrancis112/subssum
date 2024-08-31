import { Types } from 'mongoose';
import { IUserDocument } from '../interfaces/user.interface';

export interface CreateUserDto {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  country?: string;
  email: string;
  where_how?: string;
  password?: string;
  phone_number?: string;
  is_diaspora?: boolean;
  ip_address?: string;
  user_ref_code?: string;
  referred_by?: Types.ObjectId;
  confirm_password?: string;
}

export interface UpdateUserDto {
  user: IUserDocument;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  password?: string;
  profile_photo?: string;
}
