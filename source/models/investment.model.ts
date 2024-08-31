import mongoose, { Schema } from "mongoose";
import {
    IInvestmentStatus,
    IInvestmentOccurrence,
    IInvestmentForm,
    IInvestmentType,
    IReinvest,
} from "../interfaces/investment.interface";
import { IInvestmentCategory } from "../interfaces/plan.interface";

export const InvestmentSchema: Schema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },

        user: {
            first_name: String,
            last_name: String,
            email: String,
        },

        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plans",
        },

        investment_category: {
            type: String,
            enum: Object.values(IInvestmentCategory),
            default: IInvestmentCategory.FIXED,
        },

        investment_type: {
            type: String,
            enum: Object.values(IInvestmentType),
            default: IInvestmentType.FIXED,
        },

        listing_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listings",
        },

        no_tokens: {
            type: "Decimal128",
            default: "0",
        },

        investment_currency: {
            type: String,
            default: "USD",
        },

        amount: {
            type: "Decimal128",
            default: "0.00",
        },

        investment_occurrence: {
            type: String,
            enum: Object.values(IInvestmentOccurrence),
        },

        duration: {
            type: Number,
        },

        start_date: {
            type: Date,
        },

        end_date: {
            type: Date,
        },
        investment_status: {
            type: String,
            default: IInvestmentStatus.INVESTMENT_ACTIVE,
            enum: Object.values(IInvestmentStatus),
        },

        auto_reinvest: {
            type: Boolean,
            default: false,
        },

        reinvest: {
            type: String,
            enum: ["only_return", "only_amount", "both"],
        },

        transaction_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transactions",
        },

        cash_dividend: {
            type: Number,
            default: 0,
        },

        is_auto_reinvested: {
            type: Boolean,
            default: false,
        },

        reinvested_as: {
            type: String,
            enum: Object.values(IReinvest),
        },

        reinvested_from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Investments",
        },

        next_dividends_date: {
            type: Date,
        },

        last_dividends_date: {
            type: Date,
        },

        dividends_count: {
            type: Number,
            default: 0,
        },

        paid_out: {
            type: Boolean,
            default: false,
        },

        paid_out_date: {
            type: Date,
        },

        next_disbursement_date: {
            type: Date,
        },

        investment_form: {
            type: String,
            enum: Object.values(IInvestmentForm),
        },
    },
    { timestamps: true }
);
