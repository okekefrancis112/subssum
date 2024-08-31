//Importing modules from mongoose
import { Types, Document } from 'mongoose';

export enum ICardStatus {
  EXPIRED = 'expired',
  ACTIVE = 'active',
}

//Interface representing the schema of card documents in database
export interface ICards {
  user_id: Types.ObjectId;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  authorization_code?: string;
  platform?: string;
  card_currency?: string;
  first6?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  card_type?: string;
  bank?: string;
  is_default: boolean;
  card_status?: ICardStatus;
}

//Extending document interface with ICards to represent an instance of CardsDocument
export interface ICardsDocument extends Document, ICards {}
