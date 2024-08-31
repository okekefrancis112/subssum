// Import mongoose and Schema from mongoose
import mongoose, { Schema } from "mongoose";
import {
    IWithdrawalStatus,
    IWithdrawalStatusList,
} from "../interfaces/withdrawal-requests.interface";

export const WithdrawalRequestsSchema: Schema = new Schema(
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

        amount: {
            type: Number,
            default: 0,
        },

        reason: {
            type: String,
            default: 0,
        },

        account_details: {
            country: String,
            account_type: String,
            bank_name: String,
            account_name: String,
            account_number: String,
            iban: String,
            swift_code: String,
            wire_routing: String,
            bank_address: String,
        },

        status: {
            type: String,
            default: IWithdrawalStatus.PENDING,
            enum: IWithdrawalStatusList,
        },

        processed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUsers",
        },

        transaction_id: {
            type: String,
            ref: "Transactions",
        },

        buy_fx_rate: {
            type: Number,
            default: 0,
        },

        sell_fx_rate: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);
