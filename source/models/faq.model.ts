import mongoose, { Schema } from "mongoose";
import { IStatus } from "../interfaces/faq.interface";

export const FaqSchema: Schema = new Schema(
    {
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        },

        question: {
            type: String,
        },

        answer: {
            type: String,
        },

        status: {
            type: String,
            default: IStatus.PUBLISHED,
            enum: Object.values(IStatus),
        },

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUsers",
        },
    },

    { timestamps: true }
);
