import { Response } from "express";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import userRepository from "../../repositories/user.repository";
import planRepository from "../../repositories/portfolio.repository";
import { export2Csv, formatDecimal, repoTime } from "../../util";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import investmentRepository from "../../repositories/investment.repository";
import referRepository from "../../repositories/refer.repository";
import walletRepository from "../../repositories/wallet.repository";
import {
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionType,
} from "../../interfaces/transaction.interface";
import transactionRepository from "../../repositories/transaction.repository";
import {
    IInvestmentCategory,
    IPortfolioOccurrence,
} from "../../interfaces/plan.interface";

export async function getStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        // Set default date range if not provided
        const dateFrom: any = req.query.dateFrom || "Jan 1 2021";
        const dateTo: any = req.query.dateTo || `${Date()}`;
        const period = String(req.query.period) || "all"; // Set the period

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Gender
        const gender_pipeline = [
            {
                $match: timeFilter,
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.gender",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    gender: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Where How
        const where_how_pipeline = [
            {
                $match: timeFilter,
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.where_how",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    where_how: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Diaspora
        const diaspora_pipeline = [
            {
                $match: timeFilter,
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.is_diaspora",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    is_diaspora: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // KYC
        const kyc_pipeline = [
            {
                $match: timeFilter,
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.kyc_completed",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    kyc_completed: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Refer
        const refer_pipeline = [
            {
                $match: {
                    referred_by: { $ne: null },
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.has_invest",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    has_invest: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Referred Investment
        const refer_investment_pipeline = [
            {
                $match: {
                    referred_by: { $ne: null },
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.has_invest",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    has_invest: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Fund Wallet Channel
        const fund_wallet_channel_pipeline = [
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.payment_gateway",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    payment_channel: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Fund Wallet Method
        const fund_wallet_method_pipeline = [
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.transaction_medium",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    payment_method: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Wallet Debit Method
        const wallet_debit_pipeline = [
            {
                $match: {
                    transaction_type: {
                        $in: [
                            ITransactionType.WITHDRAWAL,
                            ITransactionType.DEBIT,
                        ],
                    },
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.keble_transaction_type",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    keble_transaction_type: {
                        $ifNull: ["$_id", "not-specified"],
                    },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Investment Payment Style
        const investment_payment_style_pipeline = [
            {
                $match: timeFilter,
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.investment_occurrence",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    payment_style: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Investment Payment Method
        const investment_payment_method_pipeline = [
            {
                $match: {
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                    ...timeFilter,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$data.transaction_medium",
                    count: { $sum: 1 },
                    total: { $first: "$total" },
                },
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    _id: 0,
                    value: "$count",
                    payment_style: { $ifNull: ["$_id", "not-specified"] },
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Age Range
        const age_range_pipeline = [
            {
                $match: timeFilter,
            },
            { $match: { dob: { $exists: true, $ne: "" } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $addFields: {
                    age: {
                        $dateDiff: {
                            startDate: { $toDate: "$data.dob" },
                            endDate: "$$NOW",
                            unit: "year",
                        },
                    },
                    total: "$total",
                },
            },
            {
                $bucket: {
                    groupBy: "$age",
                    boundaries: [18, 26, 35, 45, 65, 120],
                    default: "not-specified",
                    output: { count: { $sum: 1 }, total: { $first: "$total" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    age_range: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $lt: ["$_id", 26],
                                    },
                                    then: "18-25",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 35],
                                    },
                                    then: "26-34",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 45],
                                    },
                                    then: "35-44",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 65],
                                    },
                                    then: "45-64",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 120],
                                    },
                                    then: "65+",
                                },
                                {
                                    case: {
                                        $ifNull: ["$_id", "null"],
                                    },
                                    then: "not-specified",
                                },
                            ],
                        },
                    },
                    value: "$count",
                    percentage: {
                        $multiply: [{ $divide: ["$count", "$total"] }, 100],
                    },
                },
            },
        ];

        // Referred user
        const referred_user_pipeline = [
            {
                $match: {
                    referred_by: { $ne: null },
                },
            },
        ];

        // Referred user
        const invested_referred_user_pipeline = [
            {
                $match: {
                    referred_by: { $ne: null },
                    has_invest: true,
                    ...timeFilter,
                },
            },
        ];

        // Wallet Balance
        const wallet_pipeline = [
            { $group: { _id: null, balance: { $sum: "$balance" } } },
        ];

        // Wallet Deposit Transactions
        const deposit_pipeline = [
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                    ...timeFilter,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ];

        // Wallet Withdrawal Transactions
        const withdrawal_pipeline = [
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.WITHDRAWAL,
                    keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
                    ...timeFilter,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ];

        // Wallet Transactions
        const wallet_transaction_pipeline = [
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ];

        // Investment Amount
        const investment_pipeline = [
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ];

        // Fixed Investment Amount
        const fixed_pipeline = [
            {
                $match: {
                    investment_category: IInvestmentCategory.FIXED,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ];

        const diaspora_users = await userRepository.countDocs({
            is_diaspora: true,
        });
        const users = await userRepository.countDoc();

        const wallet_transactions = await transactionRepository.findAggregate(
            wallet_transaction_pipeline
        );
        const wallet_deposits = await transactionRepository.findAggregate(
            deposit_pipeline
        );
        const wallet_withdrawal = await transactionRepository.findAggregate(
            withdrawal_pipeline
        );
        const wallet_balance = await walletRepository.findAggregate(
            wallet_pipeline
        );
        const fund_wallet_channel_distribution =
            await transactionRepository.findAggregate(
                fund_wallet_channel_pipeline
            );
        const fund_wallet_method_distribution =
            await transactionRepository.findAggregate(
                fund_wallet_method_pipeline
            );
        const wallet_debit_distribution =
            await transactionRepository.findAggregate(wallet_debit_pipeline);
        const total_amount_invested = await investmentRepository.findAggregate(
            investment_pipeline
        );
        const total_fixed_amount_invested =
            await investmentRepository.findAggregate(fixed_pipeline);
        const investment_payment_style_distribution =
            await investmentRepository.findAggregate(
                investment_payment_style_pipeline
            );
        const investment_payment_method_distribution =
            await transactionRepository.findAggregate(
                investment_payment_method_pipeline
            );
        const refered_users = await userRepository.findAggregate(
            referred_user_pipeline
        );
        const refered_users_chart = await userRepository.findAggregate(
            refer_pipeline
        );
        const refered_invested_users = await userRepository.findAggregate(
            invested_referred_user_pipeline
        );
        const gender_stats = await userRepository.findAggregate(
            gender_pipeline
        );
        const diaspora_stats = await userRepository.findAggregate(
            diaspora_pipeline
        );
        const kyc_stats = await userRepository.findAggregate(kyc_pipeline);
        const where_how_stats = await userRepository.findAggregate(
            where_how_pipeline
        );
        const age_range_stats = await userRepository.findAggregate(
            age_range_pipeline
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Fetched your stats successfully.",
            data: {
                total_users: users,
                diaspora_users: diaspora_users,
                gender_distribution: gender_stats,
                diaspora_distribution: diaspora_stats,
                kyc_distribution: kyc_stats,
                age_group_distribution: age_range_stats,
                hear_about_us_distribution: where_how_stats,
                total_amount_invested:
                    total_amount_invested && total_amount_invested.length > 0
                        ? formatDecimal(
                              Number(total_amount_invested?.[0].amount),
                              100
                          )
                        : 0,
                fixed_amount_invested:
                    total_fixed_amount_invested &&
                    total_fixed_amount_invested.length > 0
                        ? formatDecimal(
                              Number(total_fixed_amount_invested?.[0].amount),
                              100
                          )
                        : 0,
                investment_payment_style_distribution:
                    investment_payment_style_distribution,
                investment_payment_method_distribution:
                    investment_payment_method_distribution,
                total_wallet_transactions:
                    wallet_transactions && wallet_transactions.length > 0
                        ? formatDecimal(
                              Number(wallet_transactions?.[0].amount),
                              100
                          )
                        : 0,
                total_current_balance:
                    wallet_balance && wallet_balance.length > 0
                        ? formatDecimal(
                              Number(wallet_balance?.[0].balance),
                              100
                          )
                        : 0,
                total_deposited_amount:
                    wallet_deposits && wallet_deposits.length > 0
                        ? formatDecimal(
                              Number(wallet_deposits?.[0].amount),
                              100
                          )
                        : 0,
                total_amount_withdrawn:
                    wallet_withdrawal && wallet_withdrawal.length > 0
                        ? formatDecimal(
                              Number(wallet_withdrawal?.[0].amount),
                              100
                          )
                        : 0,
                fund_wallet_channel_distribution:
                    fund_wallet_channel_distribution,
                fund_wallet_method_distribution:
                    fund_wallet_method_distribution,
                wallet_debit_distribution: wallet_debit_distribution,
                refered_users: refered_users?.length,
                refered_invested_users: refered_invested_users?.length,
                refered_users_chart: refered_users_chart,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getGenderStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const male = await userRepository.countDocs({ gender: "Male" });
        const female = await userRepository.countDocs({ gender: "Female" });
        const { data, pagination } = await userRepository.findGenderPaginated({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your gender details have been retrieved.",
            data: {
                male,
                female,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getDiasporaStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const yes = await userRepository.countDocs({ is_diaspora: true });
        const no = await userRepository.countDocs({ is_diaspora: false });
        const { data, pagination } = await userRepository.findDiasporaPaginated(
            { req }
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your diaspora details have been retrieved.",
            data: {
                yes,
                no,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getKYCStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const completed = await userRepository.countDocs({
            kyc_completed: true,
        });
        const not_completed = await userRepository.countDocs({
            kyc_completed: false,
        });
        const { data, pagination } = await userRepository.findKYCPaginated({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your kyc details have been retrieved.",
            data: {
                completed,
                not_completed,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getGenderStatisticChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const gender_chart_stats = await userRepository.findGenderChart({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your gender chart details have been fetched.",
            data: gender_chart_stats,
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function exportGenderStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const gender_stats = await userRepository.findGenderNoPagination({
            req,
        });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "gender",
            "has_invest",
            "kyc_completed",
        ];

        export2Csv(res, gender_stats, "gender_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportDiasporaStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const gender_stats = await userRepository.findDiasporaNoPagination({
            req,
        });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "is_diaspora",
            "has_invest",
            "kyc_completed",
        ];

        export2Csv(res, gender_stats, "gender_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportKYCStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const gender_stats = await userRepository.findKYCNoPagination({ req });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "kyc_completed",
            "has_invest",
            "kyc_completed",
        ];

        export2Csv(res, gender_stats, "gender_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function getAgeRangeStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const age_range = await userRepository.findAgeRange({ req });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your age range stats are here!",
            data: age_range,
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getAgeRangeStatisticChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } = await userRepository.findAgeRangeChart({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Age range chart details are in.",
            data: { data, pagination },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function exportAgeRangeStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const age_range_stats = await userRepository.findAgeRangeNopagination({
            req,
        });

        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "age_range",
            "has_invest",
            "is_diaspora",
        ];

        export2Csv(res, age_range_stats, "age_range_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function getWhereHowStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } = await userRepository.findWhereHowPaginated(
            { req }
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message:
                "Way to go! Successfully fetched the where and how details.",
            data: { data, pagination },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getWhereHowStatisticChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const where_chart_stats = await userRepository.findWhereHowChart({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message:
                "Way to go! Successfully fetched the where and how chart details.",
            data: where_chart_stats,
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function exportWhereHowStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const where_how_stats = await userRepository.findWhereHowNoPagination({
            req,
        });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "where_how",
            "has_invest",
            "is_diaspora",
        ];

        export2Csv(res, where_how_stats, "where_how_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function getPaymentStyleStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const recurring = await investmentRepository.findAggregate([
            {
                $match: {
                    investment_occurrence: IPortfolioOccurrence.RECURRING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const one_off = await investmentRepository.findAggregate([
            {
                $match: {
                    investment_occurrence:
                        IPortfolioOccurrence.ONE_TIME_PAYMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } =
            await investmentRepository.findPaymentStylePaginated({ req });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Payment Style details retrieved.",
            data: {
                one_off:
                    one_off && one_off.length > 0
                        ? formatDecimal(Number(one_off?.[0].amount!), 100)
                        : 0,
                recurring:
                    recurring && recurring.length > 0
                        ? formatDecimal(Number(recurring?.[0].amount!), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getInvestmentCategoriesStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const fixed = await investmentRepository.findAggregate([
            {
                $match: {
                    investment_category: IInvestmentCategory.FIXED,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } =
            await investmentRepository.findInvestmentCategoryPaginated({ req });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Investment Category details retrieved.",
            data: {
                fixed:
                    fixed && fixed.length > 0
                        ? formatDecimal(Number(fixed?.[0].amount), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getPaymentMethodStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const card = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.CARD,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const wallet = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const bank = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.BANK,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const direct_debit = await planRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.DIRECT_DEBIT,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } =
            await investmentRepository.findPaymentMethodPaginated({ req });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Payment Method details retrieved.",
            data: {
                card:
                    card && card.length > 0
                        ? formatDecimal(Number(card?.[0].amount), 100)
                        : 0,
                wallet:
                    wallet && wallet.length > 0
                        ? formatDecimal(Number(wallet?.[0].amount), 100)
                        : 0,
                bank:
                    bank && bank.length > 0
                        ? formatDecimal(Number(bank?.[0].amount), 100)
                        : 0,
                direct_debit:
                    direct_debit && direct_debit.length > 0
                        ? formatDecimal(Number(direct_debit?.[0].amount!), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getReferStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const invested = await userRepository.findAggregate([
            {
                $match: {
                    referred_by: { $ne: null },
                    has_invest: true,
                },
            },
        ]);
        const non_invested = await userRepository.findAggregate([
            {
                $match: {
                    referred_by: { $ne: null },
                    has_invest: false,
                },
            },
        ]);
        const { data, pagination } = await referRepository.getAllReferral(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Payment Method details retrieved.",
            data: {
                invested: invested?.length,
                non_invested: non_invested?.length,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getFundWalletStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const flutterwave = await transactionRepository.findAggregate([
            {
                $match: {
                    payment_gateway: {
                        $in: [
                            IPaymentGateway.FLUTTERWAVE,
                            IPaymentGateway.FLUTTERWAVE_APPLEPAY,
                        ],
                    },
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const paystack = await transactionRepository.findAggregate([
            {
                $match: {
                    payment_gateway: IPaymentGateway.PAYSTACK,
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } = await walletRepository.getAllFundingWallet(
            req
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Fund Wallet details retrieved.",
            data: {
                flutterwave:
                    flutterwave && flutterwave.length > 0
                        ? formatDecimal(Number(flutterwave?.[0].amount!), 100)
                        : 0,
                paystack:
                    paystack && paystack.length > 0
                        ? formatDecimal(Number(paystack?.[0].amount!), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getDebitWalletStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const investment = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.INVESTMENT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const bank = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.WITHDRAWAL,
                    keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const friend = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.DEBIT,
                    keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
                    description: `Transfer from`,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } = await walletRepository.getAllDebitWallet(
            req
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Debit Wallet details retrieved.",
            data: {
                investment:
                    investment && investment.length > 0
                        ? formatDecimal(Number(investment?.[0].amount!), 100)
                        : 0,
                bank:
                    bank && bank.length > 0
                        ? formatDecimal(Number(bank?.[0].amount!), 100)
                        : 0,
                friend:
                    friend && friend.length > 0
                        ? formatDecimal(Number(friend?.[0].amount!), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getWalletPaymentMethodStatistic(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const card = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.CARD,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const bank = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.BANK,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const diaspora = await transactionRepository.findAggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.DIRECT_DEBIT,
                    transaction_type: ITransactionType.CREDIT,
                    keble_transaction_type:
                        IKebleTransactionType.WALLET_FUNDING,
                },
            },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]);
        const { data, pagination } =
            await walletRepository.getAllWalletPaymentMethod(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "You're all set! Wallet Payment Method details retrieved.",
            data: {
                card:
                    card && card.length > 0
                        ? formatDecimal(Number(card?.[0].amount!), 100)
                        : 0,
                bank:
                    bank && bank.length > 0
                        ? formatDecimal(Number(bank?.[0].amount!), 100)
                        : 0,
                diaspora:
                    diaspora && diaspora.length > 0
                        ? formatDecimal(Number(diaspora?.[0].amount!), 100)
                        : 0,
                data,
                pagination,
            },
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function getPaymentStyleStatisticChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const payment_style_stats = await planRepository.findPaymentStyleChart({
            req,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message:
                "Payment styles chart fetched! You can now make informed decisions.",
            data: payment_style_stats,
        });
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export async function exportPaymentStyleStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const payment_style_stats =
            await investmentRepository.exportPaymentStyle({ req });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "investment_occurrence",
            "investment_category",
            "amount",
        ];

        export2Csv(res, payment_style_stats, "payment_style_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportPaymentMethodStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const payment_method_stats =
            await investmentRepository.exportPaymentMethod({ req });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "payment_method",
            "investment_occurrence",
            "investment_category",
            "amount",
        ];

        export2Csv(res, payment_method_stats, "payment_method_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportReferStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const refer_stats = await referRepository.getAllReferralNoPagination(
            req
        );
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "referral_count",
            "referred_user",
        ];

        export2Csv(res, refer_stats, "refer_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportInvestmentCategoryStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const investment_category_stats =
            await investmentRepository.exportInvestmentCategory({ req });
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "payment_method",
            "investment_occurrence",
            "investment_category",
            "amount",
        ];

        export2Csv(
            res,
            investment_category_stats,
            "investment_category_stats",
            fields
        );
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportFundWalletStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet_funding_stats =
            await walletRepository.exportAllFundingWallet(req);
        const fields = [
            "user.first_name",
            "user.middle_name",
            "user.last_name",
            "user.email",
            "payment_channel",
            "wallet_balance",
            "previous_balance",
            "amount",
            "transaction_status",
        ];

        export2Csv(res, wallet_funding_stats, "wallet_funding_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportDebitWalletStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet_debit_stats = await walletRepository.exportAllDebitWallet(
            req
        );
        const fields = [
            "user.first_name",
            "user.middle_name",
            "user.last_name",
            "user.email",
            "transaction_type",
            "category",
            "amount",
            "transaction_status",
        ];

        export2Csv(res, wallet_debit_stats, "wallet_debit_stats", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportWalletPaymentMethodStatistics(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet_payment_method_stats =
            await walletRepository.exportAllWalletPaymentMethod(req);
        const fields = [
            "user.first_name",
            "user.middle_name",
            "user.last_name",
            "user.email",
            "payment_method",
            "amount",
            "transaction_status",
        ];

        export2Csv(
            res,
            wallet_payment_method_stats,
            "wallet_payment_method_stats",
            fields
        );
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}
