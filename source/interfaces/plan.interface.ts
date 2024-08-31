import { Types, Document } from "mongoose";
import { IInvestmentForm, IInvestmentType } from "./investment.interface";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
} from "./transaction.interface";

export enum ITransactionTo {
    INVESTMENT = "investment",
}

export enum IPortfolioCategory {
    INVESTMENT = "investment",
    SAVINGS = "savings",
}

export enum IPortfolioStatus {
    PAUSE = "pause",
    RESUME = "resume",
    COMPLETE = "complete",
}

export enum IPortfolioIntervals {
    NONE = "none",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
}

export enum IPortfolioOccurrence {
    All = "all",
    RECURRING = "recurring",
    ONE_TIME_PAYMENT = "one-time-payment",
}

export enum IInvestmentCategory {
    FLEXIBLE = "flexible",
    FIXED = "fixed",
}

export interface IPortfolioDiscord {
    _id: Types.ObjectId;
    first_name: string;
    last_name: string;
    email: string;
}

export interface IPortfolioPayload {
    user_id: Types.ObjectId;
    investment_category:
        | IInvestmentCategory.FIXED
        | IInvestmentCategory.FLEXIBLE;
    investment_type: IInvestmentType;
    plan_name: string;
    amount: number;
    listing_id: Types.ObjectId;
    transaction_medium: ITransactionMedium;
    payment_gateway: IPaymentGateway;
    entity_reference: IEntityReference;
    intervals: string;
    total_amount: number;
    plan_occurrence:
        | IPortfolioOccurrence.ONE_TIME_PAYMENT
        | IPortfolioOccurrence.RECURRING;
    investment_form: IInvestmentForm;
    duration: number;
    transaction_hash: string;
    payment_reference: string;
    webhook_id?: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    meta_data?: any;
    session: any;
}

export interface InvestmentPlanDetails {
    _id: Types.ObjectId;
    plan_status: string;
    user_id: Types.ObjectId;
    listing_id: Types.ObjectId;
    plan_name: string;
    plan_occurrence: string;
    start_date: Date;
    plan_currency: Date;
}

export interface IPortfolioTopUp {
    user_id: Types.ObjectId;
    plan: Types.ObjectId;
    amount: number;
    listing_id: Types.ObjectId;
    payment_gateway: IPaymentGateway;
    transaction_hash: string;
    payment_reference: string;
    transaction_medium: ITransactionMedium;
    investment_form: IInvestmentForm;
    entity_reference: IEntityReference;
    session: any;
}

export interface IPlan {
    investment_category?: IInvestmentCategory;
    user_id?: Types.ObjectId;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    listing_id?: Types.ObjectId;
    investments?: Array<Types.ObjectId>;
    plan_name?: string;
    counts?: number;
    plan_currency?: string;
    intervals?: IPortfolioIntervals;
    amount?: number;
    total_amount: number;
    plan_occurrence: IPortfolioOccurrence;
    last_charge_date?: Date;
    next_charge_date?: Date;
    plan_category?: IPortfolioCategory;
    no_tokens?: number;
    duration_type?: string;
    duration?: number;
    plan_status?: IPortfolioStatus;
    end_date?: Date;
    start_date?: Date;
}

// Extend IPlan with document object
export interface IPlanDocument extends Document, IPlan {}
