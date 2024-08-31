import mongoose, { Schema } from "mongoose";
import { IPaymentGateway } from "../interfaces/transaction.interface";
import { ICardStatus } from "../interfaces/cards.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";

// Create the CardsSchema with a new Schema
export const CardsSchema: Schema = new Schema(
    {
        // User Id by using the ObjectId type from mongoose schema
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
        },
        user: {
            first_name: String,
            last_name: String,
            email: String,
        },
        card_status: {
            type: String,
            enum: Object.values(ICardStatus),
        },
        // Platform is a string which takes enum values from IPaymentGateway
        platform: {
            type: String,
            enum: Object.values(IPaymentGateway),
        },
        // Card currency is a string which takes enum values from ICurrency
        card_currency: {
            type: String,
            enum: Object.values(ICurrency),
            // Default value is NGN
            default: ICurrency.NGN,
        },
        // Authorization code
        authorization_code: String,
        // Last 4 digits of the card
        last4: String,
        // First 6 digits of the card
        first6: String,
        // Expiration Month of the card
        exp_month: String,
        // Expiration Year of the card
        exp_year: String,
        // Type/kind of card
        card_type: String,
        // Bank associated with the card
        bank: String,
        // Is this the default card? Defaults to true
        is_default: { type: Boolean, default: true },
    },
    // Include timestamps
    { timestamps: true }
);
