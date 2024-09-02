import { Types, Document } from "mongoose";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
} from "./transaction.interface";

export enum IPaymentCategory {
    AIRTIME = "Airtime",
    DATA = "Data",
    ELECTRIC_BILL = "Electric Bill",
    TV_SUBSCRIPTION = "Tv Subscription",
}

export enum IPaymentStatus {
    PAUSE = "pause",
    RESUME = "resume",
    COMPLETE = "complete",
}

export enum IPaymentIntervals {
    NONE = "none",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
}

export enum IPaymentOccurrence {
    All = "all",
    RECURRING = "recurring",
    ONE_TIME_PAYMENT = "one-time-payment",
}

export interface IPaymentPayload {
    user_id: Types.ObjectId;
    payment_name: string;
    amount: number;
    listing_id: Types.ObjectId;
    transaction_medium: ITransactionMedium;
    payment_gateway: IPaymentGateway;
    entity_reference: IEntityReference;
    intervals: string;
    total_amount: number;
    payment_occurrence:
        | IPaymentOccurrence.ONE_TIME_PAYMENT
        | IPaymentOccurrence.RECURRING;
    duration: number;
    transaction_hash: string;
    payment_reference: string;
    webhook_id?: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    meta_data?: any;
    session: any;
}

export interface InvestmentPaymentDetails {
    _id: Types.ObjectId;
    payment_status: string;
    user_id: Types.ObjectId;
    listing_id: Types.ObjectId;
    payment_name: string;
    payment_occurrence: string;
    start_date: Date;
    payment_currency: Date;
}

export interface IPaymentTopUp {
    user_id: Types.ObjectId;
    payment: Types.ObjectId;
    amount: number;
    listing_id: Types.ObjectId;
    payment_gateway: IPaymentGateway;
    transaction_hash: string;
    payment_reference: string;
    transaction_medium: ITransactionMedium;
    entity_reference: IEntityReference;
    session: any;
}

export interface IPayment {
    user_id?: Types.ObjectId;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    listing_id?: Types.ObjectId;
    investments?: Array<Types.ObjectId>;
    payment_name?: string;
    counts?: number;
    payment_currency?: string;
    intervals?: IPaymentIntervals;
    amount?: number;
    total_amount: number;
    payment_occurrence: IPaymentOccurrence;
    last_charge_date?: Date;
    next_charge_date?: Date;
    payment_category?: IPaymentCategory;
    no_tokens?: number;
    duration_type?: string;
    duration?: number;
    payment_status?: IPaymentStatus;
    end_date?: Date;
    start_date?: Date;
}

// Extend IPayment with document object
export interface IPaymentDocument extends Document, IPayment {}
