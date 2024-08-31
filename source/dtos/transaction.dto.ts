import { Types, Document } from "mongoose";
import {
    IEntityReference,
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";

export interface CreateTransactionDto {
    amount?: number;
    transaction_medium?: ITransactionMedium;
    transaction_type?: ITransactionType;
    keble_transaction_type?: IKebleTransactionType;
    wallet_transaction_type?: IWalletTransactionType;
    user_id?: Types.ObjectId;
    entity_reference_id?: string;
    entity_reference?: IEntityReference;
    sub_entity_reference_id?: string;
    sender?: Types.ObjectId | null;
    recipient?: Types.ObjectId | null;
    transaction_ref?: Types.ObjectId;
    meta_data?: Record<string, any>;
    payment_reference?: string;
    payment_gateway?: IPaymentGateway;
    wallet?: {
        wallet_id?: Types.ObjectId;
        wallet_balance_before?: number;
        wallet_balance_after?: number;
    };
    // payment_interval?: string;
    // charge_type?: IChargeType;
    description?: string;
    ip_address?: string;
    note?: string | null;
    currency?: ICurrency;
    transaction_hash?: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    transaction_status?: ITransactionStatus;
    session?: any;
    transaction_to?: ITransactionTo;
}
