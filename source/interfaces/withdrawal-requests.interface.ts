import { Types, Document } from 'mongoose';

export enum IWithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Creating a list of all valid values for IWithdrawalStatus
export const IWithdrawalStatusList = [
  IWithdrawalStatus.PENDING,
  IWithdrawalStatus.APPROVED,
  IWithdrawalStatus.REJECTED,
];

export interface IWithdrawalRequests {
  user_id?: Types.ObjectId;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  amount?: number;
  reason?: string;
  buy_fx_rate?: number;
  sell_fx_rate?: number;
  account_details?: {
    country?: string;
    account_type?: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    iban?: string;
    swift_code?: string;
    wire_routing?: string;
    bank_address?: string;
  };
  status?: IWithdrawalStatus;
  transaction_id?: string;
  processed_by?: Types.ObjectId;
}

export interface IWithdrawalRequestsDocument extends Document, IWithdrawalRequests {}
