// import the types and Document interface from mongoose
import { Types, Document } from "mongoose";
import { ICurrency } from "./exchange-rate.interface";

// enum of possible transaction types (credit/debit)
export enum ITransactionType {
    CREDIT = "credit",
    DEBIT = "debit",
    WITHDRAWAL = "withdrawal",
    REINVEST = "reinvest",
}

export enum ITransactionTypeCategory {
    FUND = "fund",
    TRANSFER = "transfer",
}

// enum of possible destination of the transaction(wallet/investment/etc)
export enum ITransactionTo {
    WALLET = "wallet",
    REFERRAL_WALLET = "referral-wallet",
    INVESTMENT = "investment",
    BANK = "bank",
    INVESTMENT_TOPUP = "investment-topup",
    ADD_CARD = "add-card",
    SAVINGS = "savings",
    SAVINGS_TOPUP = "savings-topup",
}

// enum of possible statuses of the transaction
export enum ITransactionStatus {
    SUCCESSFUL = "successful",
    FAILED = "failed",
    PENDING = "pending",
}

export enum IWalletTransactionType {
    FUND_WALLET = "fund-wallet",
    DEBIT_WALLET = "debit-wallet",
    WITHDRAWAL = "withdrawal",
    SEND_TO_FRIEND = "send-to-friend",
    SEND_TO_INVESTMENT = "send-to-investment",
    INTEREST_RECEIVED = "interest-received",
    RECEIVE_FROM_FRIEND = "receive-from-friend",
    SECONDARY_MARKET = "secondary-market",
}

// enum of possible Keble Transaction types
export enum IKebleTransactionType {
    INTER_TRANSFER = "inter-transfer",
    BANK_TRANSFER = "bank-transfer",
    INVESTMENT = "investment",
    GROUP_INVESTMENT = "group-investment",
    SAVINGS = "savings",
    SAVINGS_CHALLENGE = "savings-challenge",
    WALLET_DEBIT = "wallet-debit",
    WALLET_FUNDING = "wallet-funding",
    REFERRAL = "referral",
}

//enum of possible Transaction mediums
export enum ITransactionMedium {
    KEBLE = "keble",
    WALLET = "wallet",
    CARD = "card",
    BANK = "bank",
    DIRECT_DEBIT = "direct-debit",
}

//enum of possible payment gateways
export enum IPaymentGateway {
    PAYSTACK = "paystack",
    FLUTTERWAVE = "flutterwave",
    FLUTTERWAVE_APPLEPAY = "flutterwave-applepay",
    MONO = "mono",
    APPLE_PAY = "apple-pay",
    WALLET = "wallet",
    REFERRAL_WALLET = "referral-wallet",
    KEBLE = "keble",
    DIASPORA_TRANSFER = "diaspora-transfer",
    REINVEST = "reinvest",
}

//enum of possible charge types
export enum IChargeType {
    RECURRING = "recurring",
    ONE_TIME_PAYMENT = "one-time-payment",
}

//enum of entity references
export enum IEntityReference {
    PLANS = "plans",
    SAVINGS = "savings",
    SAVINGS_CHALLENGE = "savings-challenge",
    INVESTMENTS = "investments",
}

//interface for a transaction object
export interface ITransaction {
    amount?: number;
    transaction_medium?: ITransactionMedium;
    transaction_type?: ITransactionType;
    keble_transaction_type?: IKebleTransactionType;
    wallet_transaction_type?: IWalletTransactionType;
    user_id?: Types.ObjectId;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    entity_reference_id?: string;
    entity_reference?: IEntityReference;
    sub_entity_reference_id?: string;
    wallet?: {
        wallet_id?: Types.ObjectId;
        wallet_balance_before?: number;
        wallet_balance_after?: number;
    };
    sender?: Types.ObjectId;
    recipient?: Types.ObjectId;
    transaction_ref?: Types.ObjectId;
    meta_data?: Record<string, any>;
    payment_reference?: string;
    payment_gateway?: IPaymentGateway;
    payment_interval?: string;
    charge_type?: IChargeType;
    description?: string;
    ip_address?: string;
    note?: string;
    currency?: ICurrency;
    transaction_hash?: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: number;
    transaction_status?: ITransactionStatus;
    transaction_to?: ITransactionTo;
}

// Transaction document interface to include ITransaction interface and Mongoose's Document interface
export interface ITransactionDocument extends Document, ITransaction {}
