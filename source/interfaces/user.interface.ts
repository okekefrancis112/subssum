import { Document, Types } from "mongoose";

export enum IBlackListCategory {
    SPAM_SIGN_UP = "spam-sign-up",
    INVESTMENT_WITHDRAWAL_SPAM = "investment-withdraw-spam",
    WALLET_TRANSFER = "wallet-transfer",
    OTHERS = "others",
}

export enum IGenderType {
    MALE = "Male",
    FEMALE = "Female",
}

export enum IDType {
    INTERNATIONAL_PASSPORT = "international_passport",
    NATIONAL_ID = "national_id",
    DRIVERS_LICENSE = "drivers_license",
    BVN = "bvn",
}

export enum IWhereHow {
    ALL = "All",
    FRIENDS_FAMILY = "Friends & Family",
    INSTAGRAM = "Instagram",
    TWITTER = "Twitter",
    FACEBOOK = "Facebook",
    LINKEDIN = "LinkedIn",
    YOUTUBE = "YouTube",
    GOOGLE_SEARCH = "Google Search",
    INFLUENCERS = "Influencers",
    TIKTOK = "TikTok",
    MEDIA_PUBLICATIONS = "Media Publications",
    OTHERS = "Others",
}

export enum INOKRelationship {
    SIBLING = "sibling",
    SPOUSE = "spouse",
    FRIEND = "friend",
    ACQUAINTANCE = "acquaintance",
    RELATIVE = "relative",
    OTHER = "other",
}

// Define the shape of user data
export interface IUser {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
    country?: string;
    country_code?: string;
    gender?: string;
    city?: string;
    bvn?: string;
    anchor_customer_id?: string;
    postal_code?: string;
    state?: string;
    twinku_connect?: boolean;
    last_twinku_connect_date?: Date;
    password?: string;
    is_diaspora?: boolean;
    is_deleted?: boolean;
    is_deleted_at?: Date;
    toggle_user_pin?: boolean;
    is_secret_password_set?: boolean;
    secret_password?: string;
    secret_password_hint?: string;
    secret_password_set_at?: Date;
    devices: string[];
    pin?: string;
    pin_set_at?: Date;
    kyc_percent?: string;
    kyc_allowance?: boolean;
    kyc_completed?: boolean;
    kyc_completed_at?: Date;
    total_amount_invested?: number;
    total_amount_withdrawn?: number;
    total_amount_funded?: number;
    nok_fullname?: string;
    nok_email?: string;
    nok_phone_number?: string;
    nok_relationship?: INOKRelationship;
    nok_location?: string;
    first_login?: Date;
    last_login?: Date;
    login_count?: number;
    where_how?: IWhereHow;
    is_disabled?: boolean;
    is_black_listed?: boolean;
    can_withdraw?: boolean;
    can_send_to_friend?: boolean;
    can_invest?: boolean;
    can_refer?: boolean;
    blacklist_category?: string;
    blacklist_reason?: string;
    card?: object;
    reset_password_token?: string;
    reset_password_expires?: Date;
    verified_email?: boolean;
    verified_email_at?: Date;
    profile_photo?: string;
    image_key?: string;
    account_name?: string;
    account_number?: string;
    bank?: string;
    user_ref_code?: string;
    referred_by?: Types.ObjectId;
    referral_count?: number;
    referral_invested_count?: number;
    has_invest?: string;
    nin?: string;
    bucket?: string;
    is_two_fa?: boolean;
    two_fa_set_at?: Date;
    bank_linked?: boolean;
    accepted_terms_conditions?: boolean;
    id_verification?: IDType;
    id_number?: string;
    id_verified?: boolean;
    dob?: string;
    address?: string;
    notification_count?: number;
    createdAt?: Date;
}

export interface IUserDocument extends Document, IUser {}
