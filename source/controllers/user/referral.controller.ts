import { Response } from "express";
import { startSession } from "mongoose";
import { ExpressRequest } from "../../server";
import UtilFunctions, {
    formatDecimal,
    format_query_decimal,
    throwIfUndefined,
} from "../../util";
import ResponseHandler from "../../util/response-handler";
import userRepository from "../../repositories/user.repository";
import walletRepository from "../../repositories/wallet.repository";
import referRepository from "../../repositories/refer.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { creditWallet, debitReferralWallet } from "../../helpers/wallet.helper";
import {
    IPaymentGateway,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export async function referralPage(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const auth = throwIfUndefined(req.user, "req.user");
        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        const refer_wallet = await walletRepository.getReferByUserId({
            user_id: user._id,
        });

        const { data, pagination } = await userRepository.find(req, user._id);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Refer-and-Earn details fetched successfully.",
            data: {
                referral_code: user.user_ref_code,
                no_of_referrals: user.referral_count,
                invested_or_saved: user.referral_invested_count,
                amount: refer_wallet ? refer_wallet.balance : 0,
                referrals: { data, pagination },
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function referralsPage(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const auth = throwIfUndefined(req.user, "req.user");
        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        const refer_wallet = await walletRepository.getReferByUserId({
            user_id: user._id,
        });

        const { data, pagination } = await userRepository.findReferrals(
            req,
            user._id
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Refer-and-Earn details fetched successfully.",
            data: {
                referral_code: user.user_ref_code,
                no_of_referrals: user.referral_count,
                invested_or_saved: user.referral_invested_count,
                amount: refer_wallet
                    ? formatDecimal(Number(refer_wallet.balance), 100)
                    : 0,
                referrals: { data, pagination },
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function referralChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const auth = throwIfUndefined(req.user, "req.user");

        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        const refer_chart = await referRepository.referChart({
            req,
            user_id: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Refer and earn chart retrieval successful.",
            data: refer_chart,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function sendToWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const auth = throwIfUndefined(req.user, "req.user");

        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        // ! This part handles the transfer restrictions for users without complete KYC
        if (!user.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { amount }: { amount: number } = req.body;

        // Get Refer Wallet
        const refer_wallet = await walletRepository.getReferByUserId({
            user_id: user._id,
        });

        if (!refer_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        // Validate if the amount is a positive number
        if (Number(amount) <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid amount. Amount must be greater than zero.",
            });
        }

        // Check if the amount is greater than the user's balance
        if (refer_wallet.balance < Number(amount)) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, insufficient funds.`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        const result = await Promise.all([
            debitReferralWallet({
                data: {
                    user_id: user._id,
                    amount,
                    transaction_hash,
                    reference,
                    description: `Referral fund transferred to wallet`,
                    payment_gateway: IPaymentGateway.REFERRAL_WALLET,
                    currency: ICurrency.USD,
                    transaction_type: ITransactionType.DEBIT,
                },
                session,
            }),
            creditWallet({
                data: {
                    user_id: user._id,
                    amount,
                    transaction_hash,
                    reference,
                    description: `Received from referral.`,
                    payment_gateway: IPaymentGateway.WALLET,
                    currency: ICurrency.USD,
                    transaction_to: ITransactionTo.WALLET,
                    wallet_transaction_type:
                        IWalletTransactionType.INTEREST_RECEIVED,
                },
                session,
            }),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        const error = failedTxns.map((r) => r.message);

        if (error.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: error[0],
            });
        }

        await session.commitTransaction();
        session.endSession();

        // return success response after successful user creation
        return ResponseHandler.sendSuccessResponse({
            message: `Successful`,
            code: HTTP_CODES.CREATED,
            res,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
