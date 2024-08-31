// Import mongoose and Schema to create a new schema
import mongoose, { Schema } from "mongoose";

import {
    IListingStatus,
    IListingStatusList,
    IListingAudience,
    IListingAudienceList,
    IAssetType,
    IAssetTypeList,
} from "../interfaces/listing.interface";

export const ListingSchema: Schema = new Schema(
    {
        project_name: {
            type: String,
        },

        project_image: {
            type: String,
        },

        description: {
            type: String,
        },

        time: {
            type: Number,
            default: 0,
        },

        minimum_amount: {
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

        slug: {
            type: String,
        },

        capital_appreciation: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            default: IListingStatus.ACTIVE,
            enum: IListingStatusList,
        },

        // ! This was added to enable smoother migration of old naira listings
        currency: {
            type: String,
            default: "USD",
        },

        returns: {
            type: Number,
            default: 0,
        },

        roi_range: {
            type: String,
        },

        investors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Users",
            },
        ],

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUsers",
        },

        total_investments_made: {
            type: "Decimal128",
            default: "0",
        },

        total_investment_amount: {
            type: "Decimal128",
            default: "0",
        },

        total_tokens_bought: {
            type: "Decimal128",
            default: "0",
        },

        parties_involved: {
            type: String,
        },

        strategy: {
            type: String,
        },

        activities: [
            {
                _id: mongoose.Schema.Types.ObjectId,
                title: String,
                content: String,
                image: String,
                date: Date,
            },
        ],

        audience: {
            type: String,
            default: IListingAudience.USER,
            enum: IListingAudienceList,
        },

        holding_period: {
            type: Number,
            default: 0,
        },

        available_tokens: {
            type: Number,
        },

        // !THE FOLLOWING FIELD OBJECTS WERE ADDED TO ENABLE SMOOTHER MIGRATION
        start_date: {
            type: Date,
        },
        end_date: {
            type: Date,
        },

        // !THE FOLLOWING FIELD OBJECTS WERE ADDED TO ENABLE THE NEW DESIGN

        map_url: {
            type: String,
        },

        // Define fixed_returns as a String
        fixed_returns: {
            type: Number,
            default: 0,
        },

        // Define fixed_range as a String
        fixed_range: {
            type: String,
        },

        // Define flexible_returns as a String
        flexible_returns: {
            type: Number,
            default: 0,
        },

        // Define flexible_range as a String
        flexible_range: {
            type: String,
        },

        // Define listing asset type as a String with the default set to RESIDENTIAL and enum set to IAssetTypeList
        asset_type: {
            type: String,
            default: IAssetType.RESIDENTIAL,
            enum: IAssetTypeList,
        },

        about: {
            type: String,
        },

        avg_amount_rental: {
            type: String,
        },

        avg_amount_appreciation: {
            type: String,
        },

        avg_occupancy_rate: {
            type: String,
        },

        neighborhood_attraction_1: {
            type: String,
        },

        neighborhood_attraction_1_image: {
            type: String,
        },

        neighborhood_attraction_2: {
            type: String,
        },

        neighborhood_attraction_2_image: {
            type: String,
        },

        neighborhood_attraction_3: {
            type: String,
        },

        neighborhood_attraction_3_image: {
            type: String,
        },

        neighborhood_attraction_4: {
            type: String,
        },

        neighborhood_attraction_4_image: {
            type: String,
        },

        question_1: {
            type: String,
        },

        answer_1: {
            type: String,
        },

        question_2: {
            type: String,
        },

        answer_2: {
            type: String,
        },

        question_3: {
            type: String,
        },

        answer_3: {
            type: String,
        },

        question_4: {
            type: String,
        },

        answer_4: {
            type: String,
        },

        question_5: {
            type: String,
        },

        answer_5: {
            type: String,
        },

        question_6: {
            type: String,
        },

        answer_6: {
            type: String,
        },
        version: {
            type: Number,
            default: 0,
        },
    },

    { timestamps: true }
);
