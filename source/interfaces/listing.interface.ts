// Importing the Document and Types interfaces from mongoose library
import { Document, Types } from "mongoose";

// Defining an Enum for IListingStatus which represents the status of a listing
export enum IListingStatus {
    ACTIVE = "active",
    PENDING = "pending",
    CLOSED = "closed",
}

// Defining an Enum for IAssetType which represents the type of the listing.
export enum IAssetType {
    RESIDENTIAL = "residential",
    COMMERCIAL = "commercial",
    MIXED_USE = "mixed_use",
}

// Defining an Enum for IInvestmentCategory which represents the category of the listing investment.
export enum IInvestmentPreference {
    FIXED = "fixed",
    FLEXIBLE = "flexible",
}

// Defining an Enum for IListingAudience which represents whom the listing is visible to.
export enum IListingAudience {
    ALL = "all",
    USER = "user",
    THIRD_PARTY = "third_party",
}

// Creating a list of all valid values for IListingStatus
export const IListingStatusList = [
    IListingStatus.ACTIVE,
    IListingStatus.PENDING,
    IListingStatus.CLOSED,
];

// Creating a list of all valid types for IAssetType
export const IAssetTypeList = [
    IAssetType.RESIDENTIAL,
    IAssetType.COMMERCIAL,
    IAssetType.MIXED_USE,
];

// Creating a list of all valid values for IListingAudience
export const IListingAudienceList = [
    IListingAudience.ALL,
    IListingAudience.USER,
    IListingAudience.THIRD_PARTY,
];

export interface IListingInvestmentResponse {
    _id: Types.ObjectId;
    returns: number;
    capital_appreciation: number;
    map_url: string;
    holding_period: number;
    project_name: string;
    project_image: string;
}

// Defining an object interface for IListings which contains the required fields for a Listings document
export interface IListings {
    project_name: string;
    project_image: string;
    listing_id?: Types.ObjectId;
    description: string;
    location: string;
    time?: number;
    minimum_amount: number;
    total_amount: number;
    returns: number;
    roi_range: string;
    slug: string;
    bucket: string;
    status?: string;
    capital_appreciation?: number;

    // ! Added to enable smoother migration for old naira listings
    currency?: string;
    created_by: Types.ObjectId;
    total_investments_made?: number;
    total_investment_amount?: number;
    total_tokens_bought?: number;
    parties_involved?: string;
    strategy?: string;
    activities: Array<Object>;
    investors: Array<Types.ObjectId>;
    audience?: string;
    holding_period: number;
    available_tokens: number;
    start_date?: Date;
    end_date?: Date;
    createdAt?: Date;

    // ! Added to enable new design
    asset_type: string;
    map_url: string;
    fixed_returns: number;
    fixed_range: string;
    flexible_returns: number;
    flexible_range: string;
    about: string;
    avg_amount_rental?: string;
    avg_amount_appreciation?: string;
    avg_occupancy_rate?: string;
    neighborhood_attraction_1?: string;
    neighborhood_attraction_1_image?: string;
    neighborhood_attraction_2?: string;
    neighborhood_attraction_2_image?: string;
    neighborhood_attraction_3?: string;
    neighborhood_attraction_3_image?: string;
    neighborhood_attraction_4?: string;
    neighborhood_attraction_4_image?: string;
    question_1?: string;
    answer_1?: string;
    question_2?: string;
    answer_2?: string;
    question_3?: string;
    answer_3?: string;
    question_4?: string;
    answer_4?: string;
    question_5?: string;
    answer_5?: string;
    question_6?: string;
    answer_6?: string;
    version?: number;
}

// Defining an interface for IListingDocument which extends the Document and IListings interfaces
export interface IListingDocument extends Document, IListings {}
