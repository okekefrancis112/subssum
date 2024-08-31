import { Response } from "express";
import mongoose from "mongoose";
import { ExpressRequest } from "../../server";
import UtilFunctions, {
    serverErrorNotification,
    throwIfUndefined,
} from "../../util";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import investRepository from "../../repositories/invest.repository";
import { IInvestmentStatus } from "../../interfaces/investment.interface";

import {
    IPaymentGateway,
    ITransactionTo,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { creditWallet } from "../../helpers/wallet.helper";
import exchangeRateRepository from "../../repositories/exchange-rate.repository";
import { RATES } from "../../constants/rates.constant";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import walletRepository from "../../repositories/wallet.repository";
import secondaryRepository from "../../repositories/secondary.repository";
import moment from "moment";

export async function initiateSecondaryMarket(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await mongoose.startSession();
    const user = throwIfUndefined(req.user, "req.user");

    try {
        session.startTransaction();
        const { reason } = req.body;
        const investmentId = req.params.investment_id;

        const investment = await investRepository.getOne({
            _id: investmentId,
            user_id: user._id,
        });

        if (!investment) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Investment not found",
            });
        }

        if (
            investment.investment_status !== IInvestmentStatus.INVESTMENT_ACTIVE
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Investment is not active",
            });
        }

        const dateDifference = moment().diff(investment.start_date, "months");

        if (dateDifference < RATES.SECONDARY_TIME_CAP) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `You can't sell this investment yet. You can only sell investments that are ${RATES.SECONDARY_TIME_CAP} months old or more`,
            });
        }

        if (investment.user_id.toString() !== user._id.toString()) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "You are not authorized to perform this action",
            });
        }

        const wallet = await walletRepository.getOne({
            user_id: user._id,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet not found",
            });
        }

        const { amount, listing_id, plan } = investment;

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();
        const rate = await exchangeRateRepository.getOne({ is_default: true });
        const charge = (RATES.SECONDARY_CHARGE_RATE / 100) * amount;
        const final_amount = amount - charge;

        const creditPayload = {
            user_id: user._id,
            amount: final_amount,
            reason,
            reference,
            transaction_hash,
            listing_id,
            plan,
            currency: investment.investment_currency,
            description: "Secondary Market",
            payment_gateway: IPaymentGateway.WALLET,
            transaction_to: ITransactionTo.WALLET,
            exchange_rate_value:
                rate?.ngn_usd_buy_rate || RATES.EXCHANGE_RATE_VALUE,
            exchange_rate_currency: ICurrency.USD,
            wallet_transaction_type: IWalletTransactionType.SECONDARY_MARKET,
        };

        const result = await Promise.all([
            investRepository.atomicUpdate(
                { _id: investmentId },
                { investment_status: IInvestmentStatus.INVESTMENT_MATURED },
                session
            ),
            creditWallet({ data: creditPayload, session }),
        ]);

        const [investPromise, creditPromise] = result;

        if (investPromise && creditPromise) {
            const secondaryPayload = {
                amount: final_amount,
                original_amount: amount,
                charge,
                reason,
                user_id: user._id,
                investment_id: investment._id,
                transaction_id: creditPromise?.data?.transaction[0]._id,
                listing_id: listing_id,
                plan_id: plan,
                wallet: {
                    wallet_balance_before: wallet.balance,
                    wallet_balance_after: wallet.balance + Number(final_amount),
                },
            };

            await secondaryRepository.create({
                ...secondaryPayload,
                session,
            });

            // TODO: Send email to user
            await session.commitTransaction();
            session.endSession();

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Investment has been successfully sold",
            });
        } else {
            await session.abortTransaction();
            session.endSession();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Something went wrong, don't worry, we're on it",
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error:
                `${error}` || "Something went wrong, don't worry, we're on it",
        });
    }
}
