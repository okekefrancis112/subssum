import mongoose, { Schema } from "mongoose";

import { CURRENCIES, WALLET_STATUS } from "../interfaces/wallet.interface";

export const WalletSchema: Schema = new Schema(
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

        wallet_account_number: {
            type: String,
        },

        no_of_credit_transactions: {
            type: Number,
            default: 0,
        },

        no_of_debit_transactions: {
            type: Number,
            default: 0,
        },

        total_credit_transactions: {
            type: Number,
            default: 0,
        },

        total_debit_transactions: {
            type: Number,
            default: 0,
        },

        currency: {
            type: String,
            enum: CURRENCIES,
        },

        status: {
            type: String,
            default: WALLET_STATUS.ACTIVE,
            enum: Object.values(WALLET_STATUS),
        },

        beneficiaries: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Wallets",
            },
        ],

        balance: {
            type: Number,
            default: 0,
        },

        balance_before: {
            type: Number,
            default: 0,
        },

        balance_after: {
            type: Number,
            default: 0,
        },

        last_debit_amount: {
            type: Number,
            default: 0,
        },

        last_deposit_amount: {
            type: Number,
            default: 0,
        },

        last_debit_date: {
            type: Date,
        },

        last_deposit_date: {
            type: Date,
        },
    },
    { timestamps: true }
);
