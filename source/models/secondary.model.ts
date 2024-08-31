import mongoose, { Schema } from "mongoose";

export const SecondarySchema: Schema = new Schema(
    {
        amount: {
            type: "Decimal128",
            default: "0.00",
        },

        original_amount: {
            type: "Decimal128",
            default: "0.00",
        },

        charge: {
            type: "Decimal128",
            default: "0.00",
        },

        reason: {
            type: String,
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },

        wallet: {
            wallet_balance_before: {
                type: "Decimal128",
            },
            wallet_balance_after: {
                type: "Decimal128",
            },
        },

        investment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Investments",
        },

        transaction_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transactions",
        },

        listing_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listings",
        },

        plan_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plans",
        },
    },
    { timestamps: true }
);
