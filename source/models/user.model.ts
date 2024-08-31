import mongoose, { Schema } from "mongoose";
import {
    IGenderType,
    IDType,
    INOKRelationship,
    IWhereHow,
    IBlackListCategory,
} from "../interfaces/user.interface";

export const UserSchema: Schema = new Schema(
    {
        first_name: {
            type: String,
        },

        middle_name: {
            type: String,
        },

        last_name: {
            type: String,
        },

        phone_number: {
            type: String,
        },

        gender: {
            type: String,
            enum: Object.values(IGenderType),
        },

        where_how: {
            type: String,
            enum: Object.values(IWhereHow),
        },

        country: {
            type: String,
        },

        country_code: {
            type: String,
        },

        city: {
            type: String,
        },

        state: {
            type: String,
        },

        anchor_customer_id: {
            type: String,
        },

        postal_code: {
            type: String,
        },

        twinku_connect: {
            type: Boolean,
            default: false,
        },

        last_twinku_connect_date: {
            type: Date,
        },

        email: {
            index: true,
            lowercase: true,
            // unique: true,
            type: String,
            required: true,
        },

        password: {
            type: String,
        },

        is_diaspora: {
            type: Boolean,
            default: false,
        },

        is_deleted: {
            type: Boolean,
            default: false,
        },

        is_deleted_at: {
            type: Date,
        },

        user_ref_code: {
            type: String,
        },

        bvn: {
            type: String,
        },

        referred_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },

        referral_count: {
            type: Number,
            default: 0,
        },

        referral_invested_count: {
            type: Number,
            default: 0,
        },

        has_invest: {
            type: Boolean,
            default: false,
        },

        verified_email: {
            type: Boolean,
            default: false,
        },

        total_amount_invested: {
            type: Number,
            default: 0,
        },

        total_amount_withdrawn: {
            type: Number,
            default: 0,
        },

        total_amount_funded: {
            type: Number,
            default: 0,
        },

        verified_email_at: Date,

        toggle_user_pin: {
            type: Boolean,
            default: false,
        },

        pin: {
            type: String,
        },

        pin_set_at: {
            type: Date,
        },

        one_time_secret_password: {
            type: String,
        },

        is_one_time_secret_password: {
            type: Boolean,
            default: false,
        },

        is_secret_password_set: {
            type: Boolean,
            default: false,
        },

        secret_password: {
            type: String,
        },

        secret_password_hint: {
            type: String,
        },

        secret_password_set_at: {
            type: Date,
        },

        // KYC DETAILS

        kyc_percent: {
            type: Number,
            default: 0,
        },

        kyc_allowance: {
            type: Boolean,
            default: true,
        },

        kyc_completed: {
            type: Boolean,
            default: false,
        },

        devices: [
            {
                type: String,
            },
        ],

        kyc_completed_at: Date,

        /***********
         *
         *
         *
         *
         * NEXT OF KIN DETAILS
         *
         *
         */

        nok_fullname: {
            type: String,
        },

        nok_email: {
            type: String,
            required: false,
            lowercase: true,
        },

        nok_phone_number: {
            type: String,
        },

        nok_relationship: {
            type: String,
            enum: Object.values(INOKRelationship),
        },

        nok_location: {
            type: String,
        },

        // ! RESTRICTIONS

        // ! ==========================================================================

        is_black_listed: {
            type: Boolean,
            default: false,
        },

        is_disabled: {
            type: Boolean,
            default: false,
        },

        can_withdraw: {
            type: Boolean,
            default: true,
        },

        can_send_to_friend: {
            type: Boolean,
            default: true,
        },

        can_invest: {
            type: Boolean,
            default: true,
        },

        can_refer: {
            type: Boolean,
            default: true,
        },

        blacklist_category: {
            type: String,
            enum: Object.values(IBlackListCategory),
        },

        blacklist_reason: {
            type: String,
        },
        // ! ==========================================================================
        first_login: {
            type: Boolean,
            required: false,
        },
        last_login: {
            type: Date,
        },

        login_count: {
            type: Number,
            default: 0,
        },

        accepted_terms_conditions: {
            default: false,
            type: Boolean,
        },

        profile_photo: {
            type: String,
            default: "",
        },
        dob: {
            type: String,
        },
        address: {
            type: String,
        },
        image_key: {
            type: String,
        },

        card: {
            type: Object,
        },

        id_verification: {
            required: false,
            type: String,
            enum: Object.values(IDType),
        },

        id_number: {
            type: String,
            required: false,
        },

        id_verified: {
            type: Boolean,
            default: false,
        },

        account_name: {
            type: String,
        },

        account_number: {
            type: String,
        },

        bank: {
            type: String,
        },

        bank_linked: {
            type: Boolean,
            default: false,
        },

        nin: {
            type: String,
        },

        is_two_fa: {
            type: Boolean,
            default: false,
        },

        two_fa_set_at: {
            type: Date,
        },

        bucket: {
            type: String,
        },

        notification_count: {
            type: Number,
            default: 0, //Default value set to 0
        },

        reset_password_token: {
            type: String,
        },

        reset_password_expires: {
            type: Date,
        },
    },
    { timestamps: true }
);
