import { Types } from 'mongoose';

export interface CreateBanksDto {
  country: string;
  user_id: Types.ObjectId;
  bank_name: string;
  account_number: string;
  account_name: string;
  primary: boolean;
}
