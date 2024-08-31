//Importing mongoose, Schema from mongoose
import mongoose, { Schema } from "mongoose";

//importing interfaces for Transaction-related data
import {
    IChargeType,
    IEntityReference,
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";

export const TransactionSchema: Schema = new Schema(
    {
        amount: {
            type: "Decimal128",
            default: "0.00",
        },

        transaction_type: {
            type: String,
            enum: Object.values(ITransactionType),
        },

        transaction_to: {
            type: String,
            enum: Object.values(ITransactionTo),
        },

        keble_transaction_type: {
            type: String,
            enum: Object.values(IKebleTransactionType),
        },

        wallet_transaction_type: {
            type: String,
            enum: Object.values(IWalletTransactionType),
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },

        user: {
            first_name: String,
            last_name: String,
            email: String,
        },

        entity_reference_id: {
            type: String,
        },

        wallet: {
            wallet_balance_before: {
                type: "Decimal128",
            },
            wallet_balance_after: {
                type: "Decimal128",
            },
        },

        entity_reference: {
            type: String,
            enum: Object.values(IEntityReference),
        },

        sub_entity_reference_id: {
            type: String,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },

        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },

        transaction_medium: {
            type: String,
            enum: Object.values(ITransactionMedium),
        },

        transaction_ref: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TransactionRefs",
        },

        meta_data: {
            type: Object,
        },

        payment_reference: {
            type: String,
            ref: "WithdrawalRequests",
        },

        payment_gateway: {
            type: String,
            enum: Object.values(IPaymentGateway),
        },

        payment_interval: {
            type: String,
        },

        charge_type: {
            type: String,
            enum: Object.values(IChargeType),
        },

        description: {
            type: String,
        },

        note: {
            type: String,
        },

        payment_type: {
            type: String,
        },

        channel: {
            type: String,
        },

        currency: {
            type: String,
            enum: Object.values(ICurrency),
        },

        exchange_rate_value: {
            type: "Decimal128",
            default: "0.00",
        },

        exchange_rate_currency: {
            type: "String",
        },

        transaction_hash: {
            type: String,
        },

        ip_address: {
            type: String,
        },

        transaction_status: {
            type: String,
            enum: Object.values(ITransactionStatus),
        },
    },
    { timestamps: true }
);
