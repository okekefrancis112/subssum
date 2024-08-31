// Importing the Types and Document interface from mongoose
import { Types, Document } from 'mongoose';

// Defining interface ITransactionRef containing the fields: amount, user_id, transaction_hash
export interface ITransactionRef {
  amount?: number;
  user_id?: Types.ObjectId;
  transaction_hash?: string;
}

// Defining interface ITransactionRefDocument combining interface ITransactionRef with Document interface
export interface ITransactionRefDocument extends Document, ITransactionRef {}
