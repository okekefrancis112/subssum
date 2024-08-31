import { Types, Document } from "mongoose";

export const enum WALLET_TOPUP_CATEGORIES {
    INVESTMENT = "investment",
    WALLET_FUNDING = "wallet_funding",
    REFERRAL_BONUS = "referral_bonus",
}

// An enum that contains currency codes and strings
export const enum WALLET_CURRENCIES {
    NAIRA = "NGN",
    USD = "USD",
}

export const enum ADMIN_WALLET_FILTERS {
    BALANCE = "balance",
    WITHDRAWAL_REQUEST = "withdrawal-request",
    TRANSACTIONS = "transactions",
}

// An enum containing wallet statuses
export enum WALLET_STATUS {
    ACTIVE = "active",
    INACTIVE = "inactive",
}

// A list of valid currencies
export const CURRENCIES = [WALLET_CURRENCIES.USD, WALLET_CURRENCIES.NAIRA];

// An interface defining the members of a wallet object
export interface IWalletNGN {
    user_id?: Types.ObjectId;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    no_of_credit_transactions?: number;
    no_of_debit_transactions?: number;
    total_credit_transactions?: number;
    total_debit_transactions?: number;
    wallet_account_number?: string;
    wallet_account_provider?: string;
    beneficiaries?: Array<Types.ObjectId>;
    currency?: WALLET_CURRENCIES;
    status?: WALLET_STATUS;
    balance: number;
    balance_before?: number;
    balance_after?: number;
    last_debit_amount?: number;
    last_deposit_amount?: number;
    last_debit_date?: Date;
    last_deposit_date?: Date;
}

export interface IWalletNGNDocument extends Document, IWalletNGN {}
