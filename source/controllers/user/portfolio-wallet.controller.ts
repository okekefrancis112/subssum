import { Response } from "express";
import { Types, startSession } from "mongoose";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import UtilFunctions, {
    link,
    pdfSetup,
    serverErrorNotification,
    throwIfUndefined,
} from "../../util";
import userRepository from "../../repositories/user.repository";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { debitWallet } from "../../helpers/wallet.helper";
import {
    IPortfolioOccurrence,
    IPortfolioTopUp,
    IPortfolioPayload,
} from "../../interfaces/plan.interface";
import { RATES } from "../../constants/rates.constant";
import {
    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
    DISCORD_INVESTMENT_ERROR_PRODUCTION,
    DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
    DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import {
    createInvestPortfolio,
    topUpInvestPortfolio,
} from "../../helpers/portfolio.helper";
import { NotificationTaskJob } from "../../services/queues/producer.service";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import {
    oldListingIsExist,
    portfolioIsExist,
} from "../../validations/user/portfolio.validation";

import {
    IDebitPayload,
    IInvestmentForm,
} from "../../interfaces/investment.interface";
import { INotificationCategory } from "../../interfaces/notification.interface";
import moment from "moment";
import walletRepository from "../../repositories/wallet.repository";
import { discordMessageHelper } from "../../helpers/discord.helper";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import listingRepository from "../../repositories/listing.repository";

/***************************
 *
 *
 *  Create Investment Portfolio Wallet.......
 *
 *
 */

// Function to create an Investment portfolio wallet
export async function createInvestmentPortfolioWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession();
    session.startTransaction();

    const user = throwIfUndefined(req.user, "req.user");
    try {
        const {
            plan_name,
            investment_category,
            investment_type,
            plan_occurrence,
            intervals,
            amount,
            duration,
        } = req.body;

        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!getUser.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        // Get Sender Wallet
        const wallet = await walletRepository.getByUserId({
            user_id: getUser._id,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Wallet not found, please try again.`,
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
        if (wallet.balance < Number(amount)) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, insufficient funds.`,
            });
        }

        // Check if the amount is less than the minimum investment rate
        if (amount < RATES.MINIMUM_INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
            });
        }

        if (plan_occurrence === IPortfolioOccurrence.RECURRING) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, auto reinvest is not available for wallet payments.`,
            });
        }

        const listing = await oldListingIsExist(req, duration, user);

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, no listing was found for ${duration} months.`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        const debitPayload: IDebitPayload = {
            amount: amount,
            user_id: user._id,
            currency: ICurrency.USD,
            payment_gateway: IPaymentGateway.WALLET,
            description: `Transfer to ${plan_name}.`,
            reference,
            transaction_type: ITransactionType.DEBIT,
            transaction_to: ITransactionTo.INVESTMENT,
            wallet_transaction_type: IWalletTransactionType.SEND_TO_INVESTMENT,
            transaction_hash,
        };

        const portfolioPayload: IPortfolioPayload = {
            user_id: getUser._id,
            plan_name,
            amount: amount,
            listing_id: listing._id,
            transaction_medium: ITransactionMedium.WALLET,
            payment_gateway: IPaymentGateway.WALLET,
            entity_reference: IEntityReference.INVESTMENTS,
            plan_occurrence,
            investment_form: IInvestmentForm.NEW_INVESTMENT,
            intervals: intervals,
            total_amount: amount,
            investment_category,
            investment_type,
            duration: duration,
            transaction_hash,
            payment_reference: reference,
            session,
        };

        const result = await Promise.all([
            debitWallet({ data: debitPayload, session }),
            createInvestPortfolio(portfolioPayload),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length > 0) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

            await discordMessageHelper(
                req,
                user,
                "Error during investment portfolio wallet ❌",
                DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                DISCORD_INVESTMENT_ERROR_PRODUCTION,
                "WALLET INVESTMENT",
                errors
            );

            await auditRepository.create({
                req,
                title: `Error during investment portfolio wallet`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        await discordMessageHelper(
            req,
            user,
            "Success!, your investment portfolio has been created ✅",
            DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
            DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
            "WALLET INVESTMENT",
            {
                "Amount ": amount,
                "Portfolio Name ": plan_name,
                "Duration ": duration,
            }
        );

        await auditRepository.create({
            req,
            title: `Success!, your investment portfolio has been created.`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        // Notification
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: user._id,
                title: "Investment Notification",
                notification_category: INotificationCategory.INVESTMENT,
                content: `Your ${plan_name} portfolio was created successfully.`,
                action_link: `${link()}/invest`,
            },
        });

        const deeds_data = {
            transaction_id: reference,
            name: `${user.first_name} ${user.last_name}`,
            token: amount / RATES.INVESTMENT_TOKEN_VALUE,
            project_name: listing.project_name,
            date: moment(result[1].data.portfolio[0].end_date).format(
                "DD MMMM YYYY"
            ),
        };

        const deeds_link = await pdfSetup(req, deeds_data, "deeds");

        // send a top up email to the user
        await UtilFunctions.sendEmail2("investment.hbs", {
            to: user.email,
            subject: "Keble Investment Deed",
            props: {
                email: user.email,
                name: user.first_name,
                project_name: listing.project_name,
                amount: Number(amount),
                link: deeds_link,
                no_tokens: amount / RATES.INVESTMENT_TOKEN_VALUE,
                maturity_date: moment(
                    result[1].data.portfolio[0].end_date
                ).format("DD MMMM YYYY"),
                createdAt: new Date().toLocaleString(),
            },
        });

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Success!, your investment portfolio has been created.",
            // data: deeds_link,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/***************************
 *
 *
 *  Top Up Investment Portfolio Wallet
 *
 *
 */

// Top up Investment Portfolio Wallet
export async function topUpInvestmentPortfolioWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession();
    session.startTransaction();
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!getUser.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { amount }: { amount: number } = req.body;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: getUser._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        // Validate if the amount is a positive number
        if (amount <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid amount. Amount must be greater than zero.",
            });
        }

        // Check if the amount is greater than the user's balance
        if (sender_wallet.balance < amount) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, insufficient funds.`,
            });
        }

        const getPortfolio = await portfolioIsExist(
            req,
            new Types.ObjectId(req.params.portfolio_id),
            user
        );

        if (!getPortfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Portfolio does not exist",
            });
        }

        if (amount < RATES.MINIMUM_INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
            });
        }

        const listing = await oldListingIsExist(
            req,
            getPortfolio?.duration!,
            user
        );

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `No listing of ${getPortfolio.duration} months is available`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        // Debit Wallet
        const debitPayload = {
            amount: amount,
            user_id: user._id,
            currency: ICurrency.USD,
            payment_gateway: IPaymentGateway.WALLET,
            description: `Transfer to ${getPortfolio.plan_name}.`,
            transaction_to: ITransactionTo.INVESTMENT,
            transaction_type: ITransactionType.DEBIT,
            wallet_transaction_type: IWalletTransactionType.SEND_TO_INVESTMENT,
            reference,
            transaction_hash,
        };

        // Create Top Up
        const investmentPayload: IPortfolioTopUp = {
            user_id: getUser._id,
            plan: getPortfolio._id,
            amount: amount,
            listing_id: listing._id,
            payment_gateway: IPaymentGateway.WALLET,
            transaction_hash,
            payment_reference: reference,
            investment_form: IInvestmentForm.NEW_INVESTMENT,
            transaction_medium: ITransactionMedium.WALLET,
            entity_reference: IEntityReference.INVESTMENTS,
            session,
        };

        const result = await Promise.all([
            debitWallet({ data: debitPayload, session }),
            topUpInvestPortfolio(investmentPayload),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length > 0) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

            await discordMessageHelper(
                req,
                user,
                "Error during wallet investment topup ❌",
                DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                DISCORD_INVESTMENT_ERROR_PRODUCTION,
                "WALLET INVESTMENT TOPUP",
                errors
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Error during investment portfolio topup`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        const rate = RATES.INVESTMENT_TOKEN_VALUE;
        const tokens = amount / rate;

        await listingRepository.atomicUpdate(
            { _id: listing._id },
            {
                $inc: {
                    available_tokens: -Number(tokens),
                    total_investments_made: 1,
                    total_investment_amount: Number(amount),
                    total_tokens_bought: Number(tokens),
                },
                $addToSet: { investors: user._id },
            },
            session
        );

        await userRepository.atomicUpdate(
            user._id,
            { $inc: { total_amount_invested: Number(amount) } },
            session
        );

        await discordMessageHelper(
            req,
            user,
            "Investment topup successful ✅",
            DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
            DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
            "WALLET INVESTMENT",
            {
                "Amount ": amount,
                "Portfolio Name ": getPortfolio.plan_name,
                "Duration ": getPortfolio.duration,
            }
        );

        // Audit
        await auditRepository.create({
            req,
            title: `Investment topup portfolio created successfully`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        // Notification
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: user._id,
                title: "Investment Notification",
                notification_category: INotificationCategory.INVESTMENT,
                content: `Your ${getPortfolio.plan_name} was topped up with $${amount}.`,
                action_link: `${link()}/invest`,
            },
        });

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Investment topup successful.",
        });
    } catch (error) {
        await serverErrorNotification(req, error, user);
        await session.abortTransaction();
        session.endSession();

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
