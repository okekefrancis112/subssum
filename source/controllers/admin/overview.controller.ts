import { Response } from "express";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import userRepository from "../../repositories/user.repository";
import planRepository from "../../repositories/portfolio.repository";
import transactionRepository from "../../repositories/transaction.repository";
import investmentRepository from "../../repositories/investment.repository";

import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { formatDecimal, format_query_decimal } from "../../util";
import { IInvestmentCategory } from "../../interfaces/plan.interface";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { IEntityReference, IKebleTransactionType, ITransactionDocument, ITransactionTo, IWalletTransactionType } from "../../interfaces/transaction.interface";
import listingRepository from "../../repositories/listing.repository";

export async function getRecentUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const users = await userRepository.getRecent(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "All set! Users overview successfully retrieved.",
            data: users,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getRecentInvestment(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const investments = await planRepository.getRecent(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your investment overview has been successfully fetched!",
            data: investments,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getRecentWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallets = await transactionRepository.getRecent(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Wallets overview fetched.",
            data: wallets,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getOverviewCards(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const total_users = await userRepository.countDocs({is_black_listed: false});

        const all_investments = await investmentRepository.find({});

        const all_transactions_usd = await transactionRepository.findAggregate([
            {
                $group: {
                    _id: null,
                    amount: {
                        $sum: { $toDouble: "$amount" },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    amount: format_query_decimal("$amount", 100),
                },
            },
        ]);

        const fix_transactions_usd = await investmentRepository.findAggregate([
            {
                $group: {
                    _id: null,
                    amount: {
                        $sum: { $toDouble: "$amount" },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    amount: format_query_decimal("$amount", 100),
                },
            },
        ]);

        const fixed_investments = await investmentRepository.find({
            where: {
                investment_category: {
                    $ne: IInvestmentCategory.FLEXIBLE
                }
            }
        });

        const flexible_investments = await investmentRepository.find({
            investment_category: IInvestmentCategory.FLEXIBLE,
        });

        const listing = await listingRepository.countDocs({});

        const fixed_amount_invested: number = fixed_investments.reduce(
            (accumulator: number, e: { amount: number }) => {
                return Number(accumulator) + Number(e.amount);
            },
            0
        );

        const flexible_amount_invested: number = flexible_investments.reduce(
            (accumulator: number, e: { amount: number }) => {
                return Number(accumulator) + Number(e.amount);
            },
            0
        );

        const total_tokens = all_investments.reduce(
            (
                accumulator: number,
                e: {
                    no_tokens: number;
                }
            ) => {
                return Number(accumulator) + Number(e.no_tokens);
            },
            0
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your card overview has been fetched successfully!",
            data: {
                total_users,
                total_amount_invested: fixed_amount_invested + flexible_amount_invested,
                fixed_amount_invested,
                flexible_amount_invested,
                total_tokens,
                // total_tokens: total_tokens!.length > 0? total_tokens![0].no_tokens : 0,
                // all_investment,
                fix_transactions_usd: fix_transactions_usd!.length > 0? fix_transactions_usd![0].amount : 0,
                total_listings: listing,
                all_transactions_usd: all_transactions_usd!.length > 0? all_transactions_usd![0].amount : 0,
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

export async function getOverviewChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const filter = req.query.filter || "users";

        let filter_data;

        if (filter === "users") {
            filter_data = await userRepository.usersChart({ req });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User insights retrieved successfully.",
                data: filter_data,
            });
        } else if (filter === "usd-transactions") {
            filter_data = await transactionRepository.usdTransactionsChart({
                req,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Your USD transactions chart is ready!",
                data: filter_data,
            });
        } else if (filter === "ngn-transactions") {
            filter_data = await transactionRepository.ngnTransactionsChart({
                req,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Your NGN transactions chart is ready!",
                data: filter_data,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
