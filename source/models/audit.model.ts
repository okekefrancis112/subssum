import mongoose, { Schema } from "mongoose";
import {
    IAuditActivityType,
    IAuditActivityStatus,
} from "../interfaces/audit.interface";

export const AuditSchema: Schema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },

        name: {
            type: String,
        },

        activity_type: {
            type: String,
            enum: Object.values(IAuditActivityType),
            default: IAuditActivityType.ACCESS,
        },

        activity_status: {
            type: String,
            enum: Object.values(IAuditActivityStatus),
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        headers: {
            type: JSON,
            required: true,
        },

        data: {
            type: JSON,
            required: false,
        },

        source_ip: {
            type: String,
            required: true,
        },

        path: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);
