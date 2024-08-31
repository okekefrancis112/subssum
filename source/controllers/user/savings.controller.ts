import { Response } from "express";
import mongoose, { Types } from "mongoose";
import {
    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import transactionRepository from "../../repositories/transaction.repository";
import UtilFunctions, { getNumberOfDaysInMonth } from "../../util";
import {
    IPaymentGateway,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { RATES } from "../../constants/rates.constant";
import moment from "moment";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { creditWallet } from "../../helpers/wallet.helper";
import { discordMessageHelper } from "../../helpers/discord.helper";
import userRepository from "../../repositories/user.repository";

export async function processSavings(req: ExpressRequest, res: Response) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const current_date = new Date();
        const current_month = current_date.getMonth();
        const current_year = current_date.getFullYear();

        const start_date = new Date(
            current_year,
            current_month,
            1,
            0,
            59,
            59,
            999
        );
        const end_date = new Date(
            current_year,
            current_month + 1,
            0,
            24,
            59,
            59,
            999
        );

        // query for transactions between two dates
        const transactions = await transactionRepository.find({
            createdAt: { $gte: start_date, $lte: end_date },
        });

        // create a set to store the ids of users who have withdrawals
        let usersWithWithdrawals = new Set();

        // map over all transactions and filter out DEBIT and WITHDRAWAL types and add user ids to the 'usersWithWithdrawals' Set
        transactions.map((transaction: any) => {
            if (
                (transaction.transaction_type === ITransactionType.DEBIT &&
                    transaction.transaction_to !== ITransactionTo.INVESTMENT) ||
                transaction.transaction_type === ITransactionType.WITHDRAWAL
            ) {
                usersWithWithdrawals.add(transaction.user_id);
            }
        });

        // filter the transactions to get those which don't belong to users in the 'usersWithWithdrawals' set
        const transactionWithoutWithdrawals = transactions.filter(
            (transaction: any) => !usersWithWithdrawals.has(transaction.user_id)
        );

        // Group transactions by user_id
        const groupedTransactions = transactionWithoutWithdrawals.reduce(
            (acc: any, transaction: any) => {
                const { user_id } = transaction;

                // If user_id is not in the accumulator, add it with an empty array
                if (!acc[user_id]) {
                    acc[user_id] = [];
                }

                // Push the current transaction to the user_id's array
                acc[user_id].push(transaction);

                return acc;
            },
            {}
        );

        const interestRate = RATES.SAVINGS_RATE_VALUE / 12;

        for (const user_id in groupedTransactions) {
            const user_object = await userRepository.getOne({
                _id: new Types.ObjectId(user_id),
            });

            const userTransactions = groupedTransactions[user_id];

            const totalReturns = userTransactions.reduce(
                (total: any, transaction: any) => {
                    const { createdAt } = transaction;

                    // calculate by duration
                    const start_date = new Date(createdAt);
                    const duration_difference = moment(end_date).diff(
                        start_date,
                        "days",
                        true
                    );

                    const total_days_in_month = getNumberOfDaysInMonth();

                    const returns =
                        (duration_difference / total_days_in_month) *
                        interestRate;

                    return total + returns;
                },
                0
            );

            const reference = UtilFunctions.generateTXRef();
            const transaction_hash = UtilFunctions.generateTXHash();

            // Send to user's wallet
            const creditPayload = {
                user_id: new Types.ObjectId(user_id),
                amount: totalReturns,
                currency: ICurrency.USD,
                payment_gateway: IPaymentGateway.WALLET,
                transaction_type: ITransactionType.CREDIT,
                transaction_to: ITransactionTo.SAVINGS,
                reference,
                transaction_hash,
                wallet_transaction_type:
                    IWalletTransactionType.INTEREST_RECEIVED,
                description: "Savings Interest",
            };

            const result = await creditWallet({
                data: creditPayload,
                session,
            });

            if (!result.success) {
                await session.abortTransaction();
                session.endSession();

                await discordMessageHelper(
                    req,
                    user_object as any,
                    `Something happened | Your transactions have been canceled. ❌`,
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "SAVINGS INTEREST WALLET FUNDING",
                    result
                );

                continue;
            }

            await session.commitTransaction();
            await session.endSession();
        }
    } catch (error: any) {
        await session.abortTransaction();

        await discordMessageHelper(
            req,
            {} as any,
            `Something happened | Your transactions have been canceled. ❌`,
            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
            "SAVINGS INTEREST WALLET FUNDING",
            error.message
        );
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}
