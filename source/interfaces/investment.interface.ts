// This code is used to define an interface for investments in a database
import { Types, Document } from "mongoose";
import {
    IPaymentGateway,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "./transaction.interface";
import { ICurrency } from "./exchange-rate.interface";

export enum IInvestmentForm {
    RE_INVESTMENT = "re-investment",
    NEW_INVESTMENT = "new-investment",
    RECURRING_INVESTMENT = "recurring-investment",
}

// Enum to represent the possible investment occurrences
export enum IInvestmentOccurrence {
    RECURRING = "recurring",
    ONE_TIME_PAYMENT = "one-time-payment",
}

// Enum to represent the different statuses of a single investment
export enum IInvestmentStatus {
    INVESTMENT_ACTIVE = "investment-active",
    INVESTMENT_MATURED = "investment-matured",
}

// Enum to represent the different reinvestment settings
export enum IReinvest {
    ONLY_RETURNS = "only_return",
    ONLY_AMOUNT = "only_amount",
    BOTH = "both",
}

export interface IReinvestment {
    user_id: Types.ObjectId;
    plan: Types.ObjectId;
    amount: number;
    listing_id: Types.ObjectId;
    entity_reference: string;
    is_auto_reinvested: boolean;
}

export interface IReinvestmentCredit {
    amount: number;
    user_id: Types.ObjectId;
    currency: string;
    payment_gateway: string;
    description: string;
    reference: string;
    transaction_hash: string;
}

export interface IInvestmentPayload {
    investment_status: string;
    amount: number;
    _id: Types.ObjectId;
    auto_reinvest: boolean;
    start_date: Date;
    end_date: Date;
    investment_occurrence: string;
    listing_id: Types.ObjectId;
}

export interface IInvestmentArray {
    _id: Types.ObjectId;
    amount: number;
    project_name?: string;
    project_image?: string;
    project_location?: string;
    amount_invested: number;
    auto_reinvest?: boolean;
    current_value: number;
    cash_dividends?: number;
    investment_occurrence?: string;
    current_returns?: number;
}

export interface IDebitPayload {
    amount: number;
    user_id: Types.ObjectId;
    currency: ICurrency;
    payment_gateway: IPaymentGateway;
    description: string;
    reference: string;
    transaction_to: ITransactionTo;
    transaction_hash: string;
    transaction_type: ITransactionType;
    wallet_transaction_type: IWalletTransactionType;
}

export enum IInvestmentType {
    FIXED = "fixed",
    REITS = "reits",
    ETFS = "etfs",
}

// Interface representing the fields to be stored in the investment database
export interface IInvestment {
    user_id?: Types.ObjectId;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    listing_id?: Types.ObjectId | string;
    plan?: Types.ObjectId;
    investment_category?: string;
    investment_type?: IInvestmentType;
    amount: number;
    no_tokens: number;
    investment_occurrence?: IInvestmentOccurrence;
    duration: number;
    investment_currency?: string;
    start_date: Date;
    end_date: Date;
    investment_status?: IInvestmentStatus;
    auto_reinvest?: boolean;
    reinvest?: string;
    is_auto_reinvested?: boolean;
    reinvested_as?: string;
    reinvested_from?: Types.ObjectId;
    transaction_id?: Types.ObjectId;
    cash_dividend?: number;
    paid_out?: boolean;
    paid_out_date?: Date;
    next_disbursement_date?: Date;
    next_charge_date?: Date;
    next_dividends_date?: Date;
    last_dividends_date?: Date;
    dividends_count?: number;
    investment_form?: IInvestmentForm;
}

export interface IInvestmentDocument extends Document, IInvestment {}
