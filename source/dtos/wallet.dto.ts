import { Types } from 'mongoose';

export interface CreateWalletDto {
  user_id: Types.ObjectId;
  user?: any;
  wallet_account_number: string;
  total_credit_transactions: number;
  currency: string;
  balance: number;
  session?: any;
}
