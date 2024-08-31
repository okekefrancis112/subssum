import { FilterQuery, Types } from "mongoose";
import {
    ITransactionRef,
    ITransactionRefDocument,
} from "../interfaces/transaction_ref.interface";
import { TransactionRef } from "../models";

class TransactionRefRepository {
    // Create Transaction Reference
    public async create({
        amount,
        transaction_hash,
        user_id,
        session,
    }: {
        amount: number;
        transaction_hash: string;
        user_id: Types.ObjectId;
        session: any;
    }): Promise<ITransactionRefDocument | null | any> {
        const data = {
            amount,
            transaction_hash,
            user_id,
        };

        const transaction = await TransactionRef.create([data], { session });

        return transaction;
    }

    // This function get transaction references using the query object provided
    public async getOne(
        query: FilterQuery<ITransactionRefDocument>
    ): Promise<ITransactionRefDocument> {
        return TransactionRef.findOne(
            query
        ).exec() as Promise<ITransactionRefDocument>;
    }
}

// Export TransactionRefRepository
export default new TransactionRefRepository();
