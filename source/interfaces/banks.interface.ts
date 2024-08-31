// Importing the Types type from the mongoose package
import { Types } from 'mongoose';

// A enumerated list of countries for the IBanks interface
export enum IBankCountry {
  NIGERIA = 'nigeria',
}

// A enumerated list of countries for the IBanks interface
export enum IBankType {
  NGN = 'NGN',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

// Interface for the banks object
export interface IBanks {
  // Unique ID for each user
  user_id: Types.ObjectId;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  // Name of the bank
  bank_name: String;
  // Country of the bank
  country: IBankCountry;
  // Bank account number
  account_number: String;
  // Account owner's name
  account_name: String;
  // Boolean determining if it is the primary account
  primary: boolean;

  // ! Foreign Bank Details
  // Bank account type
  account_type: IBankType;

  // IBAN
  iban?: String;

  // Swift Code
  swift_code?: String;

  // Sort Code
  sort_code?: String;

  // Wire Routing
  wire_routing?: String;

  // Bank Address
  bank_address: String;
}

// Document defining the IBanksDocument type
export interface IBanksDocument extends Document, IBanks {}
