// Import mongoose and Schema to create a new schema
import mongoose, { Schema } from "mongoose";

export const PaymentSchema: Schema = new Schema(
    {
        name: {
            type: String,
        },

        description: {
            type: String,
        },

        amount: {
            type: Number,
            default: 0,
        },

        total_amount: {
            type: Number,
            default: 0,
        },

        location: {
            type: String,
        },

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUsers",
        },

        start_date: {
            type: Date,
        },

        end_date: {
            type: Date,
        },

        about: {
            type: String,
        },
        version: {
            type: Number,
            default: 0,
        },
    },

    { timestamps: true }
);
