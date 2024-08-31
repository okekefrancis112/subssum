// Importing Mongoose Types and Document interfaces
import { Types, Document } from 'mongoose';

// Interface defining the properties of IReferWallet object
export interface IReferWallet {
  //user_id property of type ObjectId
  user_id?: Types.ObjectId;

  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };

  //balance property of type number
  balance: number;

  //no_of_credit_transactions property of type number
  no_of_credit_transactions?: number;

  //no_of_debit_transactions property of type number
  no_of_debit_transactions?: number;

  //total_credit_transactions property of type number
  total_credit_transactions?: number;

  //total_debit_transactions property of type number
  total_debit_transactions?: number;

  // balance_before property of type number
  balance_before?: number;

  // balance_after property of type number
  balance_after?: number;

  // last_debit_amount property of type number
  last_debit_amount?: number;

  // last_deposit_amount property of type number
  last_deposit_amount?: number;

  // last_debit_date property of type Date
  last_debit_date?: Date;

  // last_deposit_date property of type Date
  last_deposit_date?: Date;
}

// Defining IReferWalletDocument interfase which extends Document and IReferWallet interfaces
export interface IReferWalletDocument extends Document, IReferWallet {}
