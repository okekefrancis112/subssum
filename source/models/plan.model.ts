import mongoose, { Types, Schema } from "mongoose";
import {
    IPortfolioCategory,
    IPortfolioOccurrence,
    IPortfolioStatus,
    IPortfolioIntervals,
    IInvestmentCategory,
} from "../interfaces/plan.interface";

export const PlanSchema: Schema = new Schema(
    {
        user_id: {
            type: Types.ObjectId,
            ref: "Users",
        },

        user: {
            first_name: String,
            last_name: String,
            email: String,
        },

        plan_name: {
            type: String,
        },

        investment_category: {
            type: String,
            enum: Object.values(IInvestmentCategory),
        },

        intervals: {
            type: String,
            enum: Object.values(IPortfolioIntervals),
        },

        plan_currency: {
            type: String,
            default: "USD",
        },

        counts: {
            type: Number,
        },

        listing_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listings",
        },

        investments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Investments",
            },
        ],

        plan_category: {
            type: String,
            enum: Object.values(IPortfolioCategory),
        },

        amount: {
            type: "Decimal128",
            default: "0.00",
        },

        total_amount: {
            type: "Decimal128",
            default: "0.00",
        },

        plan_occurrence: {
            type: String,
            enum: Object.values(IPortfolioOccurrence),
        },

        plan_status: {
            type: String,
            default: IPortfolioStatus.RESUME,
            enum: Object.values(IPortfolioStatus),
        },

        no_tokens: {
            type: "Decimal128",
            default: "0.00000",
        },

        duration: {
            type: Number,
        },

        last_charge_date: {
            type: Date,
        },

        next_charge_date: {
            type: Date,
        },

        end_date: {
            type: Date,
        },

        start_date: {
            type: Date,
        },
    },

    { timestamps: true }
);
