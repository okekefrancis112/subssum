import { Types, Document } from "mongoose";

export interface ISecondary {
    amount: number;
    original_amount?: number;
    charge?: number;
    user_id: Types.ObjectId;
    reason?: string;
    wallet: {
        wallet_balance_before?: number;
        wallet_balance_after?: number;
    };
    investment_id: Types.ObjectId;
    transaction_id: Types.ObjectId;
    listing_id: Types.ObjectId;
    plan_id: Types.ObjectId;
}

export interface ISecondaryDocument extends Document, ISecondary {}
