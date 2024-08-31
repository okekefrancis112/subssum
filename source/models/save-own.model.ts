import { Schema } from "mongoose";

export const SaveOwnSchema: Schema = new Schema(
    {
        asset_name: {
            type: String,
        },

        asset_type: {
            type: String,
            enum: [
                "house",
                "apartment",
                "condo",
                "townhouse",
                "land",
                "commercial",
                "other",
            ],
        },

        location: {
            address: String,
            city: String,
            state: String,
            zip_code: String,
        },

        amount: {
            type: Number,
        },

        asset_size: {
            total_area: String,
            plot_size: String,
            plot_size_unit: String,
        },

        rooms: {
            bedrooms: String,
            bathrooms: String,
            kitchens: String,
            living_rooms: String,
            dining_rooms: String,
            other_rooms: String,
            study_rooms: String,
        },

        parking: {
            parking_spaces: String,
            garage: String,
        },

        amenities: {
            air_conditioning: String,
            heating: String,
            internet: String,
            cable_tv: String,
            washer: String,
            dryer: String,
            fireplace: String,
            pool: String,
            elevator: String,
            wheelchair_accessible: String,
            doorman: String,
            smart_home: String,
            swimming_pool: Boolean,
            garden: Boolean,
            gym: Boolean,
            security_system: Boolean,
            balcony: Boolean,
        },

        other: {
            furnished: Boolean,
            pets_allowed: Boolean,
            smoking_allowed: Boolean,
        },
    },
    {
        timestamps: true,
    }
);
