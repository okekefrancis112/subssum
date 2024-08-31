import { FilterQuery, Types } from "mongoose";
import {
    IWithdrawalRequests,
    IWithdrawalRequestsDocument,
} from "../interfaces/withdrawal-requests.interface";
import { WithdrawalRequest } from "../models";
import { ITransactionDocument, ITransactionType, ITransactionStatus, ITransactionMedium, IKebleTransactionType } from "../interfaces/transaction.interface";
import { ExpressRequest } from "../server";
import { repoPagination, repoSearch, repoTime } from "../util";

class WithdrawalRepository {
    public async create({
        user_id,
        amount,
        reason,
        account_details,
        buy_fx_rate,
        sell_fx_rate,
        transaction_id,
        session,
    }: {
        user_id: Types.ObjectId;
        amount: number;
        reason: string;
        account_details: any;
        transaction_id: string;
        buy_fx_rate: number;
        sell_fx_rate: number;
        session: any;
    }): Promise<IWithdrawalRequestsDocument | null | any> {
        const data = {
            user_id,
            amount,
            reason,
            account_details,
            buy_fx_rate,
            sell_fx_rate,
            transaction_id,
        };

        const withdrawal = await WithdrawalRequest.create([data], { session });

        return {
            success: true,
            withdrawal: withdrawal[0],
        };
    }

    public async findAggregate(
        query: any
    ): Promise<IWithdrawalRequestsDocument[] | null> {
        return WithdrawalRequest.aggregate(query);
    }

    // Get single withdrawal by withdrawal_id
    public async getSingleWithdrawal(
        withdrawal_id: Types.ObjectId
    ): Promise<IWithdrawalRequestsDocument | null> {
        const withdrawal = await WithdrawalRequest.findOne({
            _id: withdrawal_id,
        }).populate({
            path: "user_id",
            select: "first_name last_name middle_name email buy_fx_rate sell_fx_rate",
        });

        return withdrawal;
    }

    // This function returns a promise of IWithdrawalRequestsDocument or null
    // It takes a withdrawal_id property as an argument
    public async getOne(
        transaction_id: string
    ): Promise<IWithdrawalRequestsDocument | null> {
        // Finds one WithdrawalRequest document with the given withdrawal_id
        return WithdrawalRequest.findOne({ transaction_id: transaction_id });
    }

    // This function returns a promise of IWithdrawalRequestsDocument or null
    // It takes a transaction_id property as an argument
    public async getOneByTransactionId(
        transaction_id: string
    ): Promise<IWithdrawalRequestsDocument | null> {
        // Finds one WithdrawalRequest document with the given transaction_id
        return WithdrawalRequest.findOne({ transaction_id });
    }

    // This function updates withdrawal requests using withdrawal_id
    public async atomicUpdate(withdrawal_id: Types.ObjectId, record: any) {
        return WithdrawalRequest.findOneAndUpdate(
            { _id: withdrawal_id },
            { ...record },
            { new: true }
        );
    }

    public async find(
        query: FilterQuery<IWithdrawalRequestsDocument>,
        select: any = ""
    ): Promise<IWithdrawalRequestsDocument | null | any> {
        return WithdrawalRequest.find(query)
            .populate("transaction_id")
            .select(select)
            .sort({ createdAt: -1 });
    }

}

// Export Repository
export default new WithdrawalRepository();
