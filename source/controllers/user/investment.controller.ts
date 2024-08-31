import { Response } from "express";
import moment from "moment";
import { Types } from "mongoose";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import {
    convertDate,
    formatDecimal,
    getAuthorizedUser,
    getMonthsDate,
    serverErrorNotification,
    throwIfUndefined,
} from "../../util";
import userRepository from "../../repositories/user.repository";
import investmentRepository from "../../repositories/investment.repository";
import planRepository from "../../repositories/portfolio.repository";
import { Investment } from "../../models";
import transactionRepository from "../../repositories/transaction.repository";
import { IKebleTransactionType } from "../../interfaces/transaction.interface";
import {
    listingIsExist,
    portfolioIsExist,
} from "../../validations/user/portfolio.validation";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import {
    IInvestmentDocument,
    IInvestmentStatus,
} from "../../interfaces/investment.interface";
import listingRepository from "../../repositories/listing.repository";
import { IInvestmentCategory } from "../../interfaces/plan.interface";
import investRepository from "../../repositories/invest.repository";
import {
    computeAccumulatedReturns,
    computeDividends,
    computeDurationDifference,
    expectedPayout,
} from "../../helpers/computations.helper";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import portfolioRepository from "../../repositories/portfolio.repository";

export async function myInvestPortFolioOverview(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }

        const user_id = user._id;
        const investments = await investmentRepository.find({
            user_id,
            // investment_currency: ICurrency.USD,
            investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
        });

        const portfolio_value_array = [];
        const listings_set = new Set();

        for (const investment of investments as IInvestmentDocument[]) {
            const {
                listing_id,
                amount,
                start_date,
                end_date,
                investment_category,
                last_dividends_date,
            } = investment;

            const listing = await listingRepository.getOne({ _id: listing_id });
            const hourDifference = computeDurationDifference({
                end_date: new Date(),
                start_date: new Date(start_date),
            });
            const duration_difference = computeDurationDifference({
                end_date: new Date(end_date),
                start_date: new Date(start_date),
            });

            if (investment_category === IInvestmentCategory.FLEXIBLE) {
                if (!listings_set.has(String(listing?._id))) {
                    listings_set.add(String(listing?._id));
                }

                const between_months = computeDurationDifference({
                    start_date: new Date(last_dividends_date!),
                    end_date: new Date(end_date),
                });

                const accumulatedReturns = computeAccumulatedReturns({
                    duration: between_months / duration_difference,
                    roi: listing?.flexible_returns || listing?.returns || 0,
                    amount: Number(amount),
                });

                portfolio_value_array.push(
                    Number(accumulatedReturns) + Number(amount)
                );
            } else if (investment_category === IInvestmentCategory.FIXED) {
                if (!listings_set.has(String(listing?._id))) {
                    listings_set.add(String(listing?._id));
                }

                const accumulatedReturns = computeAccumulatedReturns({
                    duration: hourDifference / duration_difference,
                    amount: Number(amount),
                    roi: listing?.fixed_returns || listing?.returns || 0,
                });
                const total = Number(amount) + accumulatedReturns;

                portfolio_value_array.push(Number(total));
            } else {
                if (!listings_set.has(String(listing?._id))) {
                    listings_set.add(String(listing?._id));
                }

                const accumulatedReturns = computeAccumulatedReturns({
                    duration: hourDifference / duration_difference,
                    amount: Number(amount),
                    roi: Number(listing?.returns),
                });
                const total = Number(amount) + accumulatedReturns;

                portfolio_value_array.push(Number(total));
            }
        }

        const count = listings_set.size;

        const tokens = investments?.reduce(
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

        let total_amount_invested = 0;
        let asset_array: any[] = [];
        investments?.forEach((e: any) => {
            total_amount_invested += Number(e.amount);
            asset_array.push(e.listing_id);
        });

        const { data, pagination }: any = await planRepository.findV3(
            req,
            user_id
        );

        const plans = await investmentRepository.getPlans(user._id);
        const portfolio_value = plans.reduce((accumulator: number, e: any) => {
            return Number(accumulator) + Number(e.current_value);
        }, 0);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your portfolio overview has been fetched.",
            data: {
                portfolio_value: formatDecimal(portfolio_value, 100),
                total_tokens: formatDecimal(tokens!, 100),
                no_of_assets: count,
                history: data,
                pagination,
            },
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getFixedPortfolio(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        const user = await userRepository.getOne({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }

        const user_id = user._id;

        const investments = await investRepository.find({
            user_id,
            // investment_category: {
            //     $in: [IInvestmentCategory.FIXED, IInvestmentCategory.FLEXIBLE],
            // },
            investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
        });

        let currentValueArray = [];
        for (const investment of investments) {
            const {
                listing_id,
                amount,
                start_date,
                end_date,
                investment_category,
                last_dividends_date,
            } = investment;

            const listing = await listingRepository.getOne({ _id: listing_id });

            const hourDifference = computeDurationDifference({
                end_date: new Date(),
                start_date: new Date(start_date),
            });

            const duration_difference = computeDurationDifference({
                end_date: new Date(end_date),
                start_date: new Date(start_date),
            });

            if (
                investment.investment_status ===
                    IInvestmentStatus.INVESTMENT_ACTIVE &&
                investment_category === IInvestmentCategory.FLEXIBLE
            ) {
                const between_months = computeDurationDifference({
                    start_date: new Date(last_dividends_date!),
                    end_date: new Date(),
                });
                const accumulatedReturns = computeAccumulatedReturns({
                    duration: between_months / duration_difference,
                    roi: Number(listing?.returns),
                    amount: Number(amount),
                });

                const current_value = accumulatedReturns + Number(amount);

                currentValueArray.push(current_value);
            } else if (
                investment.investment_status ===
                    IInvestmentStatus.INVESTMENT_ACTIVE &&
                investment_category === IInvestmentCategory.FIXED
            ) {
                const accumulatedReturns = computeAccumulatedReturns({
                    duration: hourDifference / duration_difference,
                    amount: Number(amount),
                    roi: Number(listing?.returns),
                });

                const current_value = accumulatedReturns + Number(amount);

                currentValueArray.push(current_value);
            }
        }

        const { data, pagination }: any = await planRepository.findV5(
            req,
            user_id
        );

        const total_amount_invested = investments.reduce(
            (accumulator: number, e: any) => accumulator + Number(e.amount),
            0
        );

        const plans = await investmentRepository.getPlans(user._id);
        const total_current_value = plans.reduce(
            (accumulator: number, e: any) => {
                return Number(accumulator) + Number(e.current_value);
            },
            0
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your fixed portfolio has been fetched.",
            data: {
                total_amount_invested: formatDecimal(
                    total_amount_invested,
                    100
                ),
                total_current_value: formatDecimal(total_current_value, 100),
                portfolios: data,
                pagination,
            },
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getFixedPortfolioInvestments(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        const user = await userRepository.getById({ _id: auth._id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }

        const portfolio_id = req.params.portfolio_id;

        const portfolio = await portfolioRepository.getOne({
            _id: new Types.ObjectId(portfolio_id),
            user_id: user._id,
        });

        if (!portfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this portfolio does not exist.",
            });
        }

        const investments = await investRepository.getAllInvestment(
            req,
            user._id,
            new Types.ObjectId(portfolio_id)
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Portfolio investments fetched.",
            data: investments,
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// exported function specificInvestmentDetails takes in two ExpressRequest and Response parameters and returns a promise
export async function specificInvestmentDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        const user = await userRepository.getById({ _id: auth._id }); // Get user

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }

        const get_investment = await investRepository.getOne(
            {
                _id: req.params.investment_id,
                user_id: user._id,
            },
            "listing_id"
        );

        // check if no investment was returned
        if (!get_investment) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this investment does not exist.",
            });
        }

        const plan = await portfolioIsExist(
            req,
            new Types.ObjectId(get_investment.plan),
            auth
        );

        // check if no portfolio was returned
        if (!plan) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Portfolio for this investment does not exist",
            });
        }

        const listing_details = {
            _id: get_investment.listing_id._id,
            project_name: get_investment.listing_id.project_name,
            location: get_investment.listing_id.location,
            project_image: get_investment.listing_id.location,
        };

        const listing = await listingIsExist(req, listing_details, auth);

        // check if no listing was returned
        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this listing does not exist.",
            });
        }

        let accumulatedReturns;

        const listing_return =
            (get_investment.investment_category === IInvestmentCategory.FIXED
                ? Number(listing.fixed_returns)
                : Number(listing.flexible_returns)) || Number(listing.returns);

        const expected_payout = expectedPayout({
            amount: Number(get_investment.amount),
            roi: listing_return,
        });

        // calculate the hour difference between current time and start date
        const hourDifference = computeDurationDifference({
            end_date: new Date(),
            start_date: new Date(get_investment.start_date),
        });

        const duration_difference = computeDurationDifference({
            end_date: new Date(get_investment.end_date),
            start_date: new Date(get_investment.start_date),
        });

        if (
            get_investment.investment_status ===
                IInvestmentStatus.INVESTMENT_ACTIVE &&
            get_investment.investment_category === IInvestmentCategory.FLEXIBLE
        ) {
            const between_months = computeDurationDifference({
                start_date: get_investment.last_dividends_date,
                end_date: new Date(),
            });
            accumulatedReturns = computeAccumulatedReturns({
                duration: between_months / duration_difference,
                roi: listing_return,
                amount: Number(get_investment.amount),
            });
        } else {
            accumulatedReturns = computeAccumulatedReturns({
                duration: hourDifference / duration_difference,
                roi: listing_return,
                amount: Number(get_investment.amount),
            });
        }

        const formatted_returns = formatDecimal(accumulatedReturns, 100);

        const cash_dividend = computeDividends({
            amount: Number(get_investment.amount),
            duration: Number(get_investment.duration),
            roi: listing_return,
        });

        let flexible_data;

        if (
            get_investment.investment_category === IInvestmentCategory.FLEXIBLE
        ) {
            flexible_data = {
                cash_dividend: formatDecimal(
                    Number(get_investment.cash_dividend),
                    100
                ),
                flexible_dividend: formatDecimal(Number(cash_dividend), 100),
            };
        }

        const {
            duration,
            start_date,
            investment_currency,
            end_date,
            investment_status,
            investment_category,
        } = get_investment;
        const data = {
            listing_id: listing._id,
            name_of_project: listing.project_name,
            project_image: listing.project_image,
            expected_earnings: formatDecimal(Number(expected_payout), 100),
            amount_invested: formatDecimal(Number(get_investment.amount), 100),
            no_of_tokens: formatDecimal(Number(get_investment.no_tokens), 100),
            returns: listing_return,
            duration: duration,
            holding_period: listing.holding_period,
            start_date: start_date,
            maturity_date: end_date,
            current_returns: formatted_returns,
            investment_currency: investment_currency,
            current_value: formatDecimal(
                Number(formatted_returns + Number(get_investment.amount)),
                100
            ),
            investment_status: investment_status,
            investment_category: investment_category,
            ...flexible_data,
        };

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Successfully fetched investment details",
            data: data,
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Get Investment Plan Details
export async function investmentInformation(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Get authorized user from request
    const auth = await getAuthorizedUser(req);

    try {
        // Get Portfolio
        const portfolio = await portfolioIsExist(
            req,
            new Types.ObjectId(req.params.portfolio_id),
            auth
        );

        // Check if plan exists else throw an error
        if (!portfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Portfolio does not exist",
            });
        }

        // Check authorization to view portfolio details, else throw an error
        if (String(portfolio.user_id) !== String(auth._id)) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "You are not authorized to view this portfolio",
            });
        }

        // Get investments for the list of plans
        const investments = await investmentRepository.find(
            {
                $and: [
                    { user_id: auth._id },
                    { plan: req.params.portfolio_id },
                ],
            },
            "listing_id"
        );
        let accumulatedArr: any = [];

        for (const investment of investments as IInvestmentDocument[]) {
            const {
                _id,
                investment_status,
                listing_id,
                amount,
                start_date,
                end_date,
                auto_reinvest,
                investment_category,
                last_dividends_date,
            } = investment;

            const listing = await listingRepository.getOne({ _id: listing_id });

            const hourDifference = computeDurationDifference({
                end_date: new Date(),
                start_date: new Date(start_date),
            });

            const duration_difference = computeDurationDifference({
                end_date: new Date(end_date),
                start_date: new Date(start_date),
            });

            if (
                investment_status === IInvestmentStatus.INVESTMENT_ACTIVE &&
                investment_category === IInvestmentCategory.FLEXIBLE
            ) {
                const between_months = computeDurationDifference({
                    start_date: new Date(last_dividends_date!),
                    end_date: new Date(),
                });
                const accumulatedReturns = computeAccumulatedReturns({
                    duration: between_months / duration_difference,
                    roi: Number(listing?.returns),
                    amount: Number(amount),
                });

                const current_value = accumulatedReturns + Number(amount);

                accumulatedArr.push({
                    _id: _id,
                    amount,
                    project_name: listing?.project_name,
                    project_image: listing?.project_image,
                    project_location: listing?.location,
                    amount_invested: formatDecimal(Number(amount), 100),
                    auto_reinvest: auto_reinvest,
                    accumulated_returns: formatDecimal(
                        Number(accumulatedReturns),
                        100
                    ),
                    current_value,
                });
            } else if (
                investment_status === IInvestmentStatus.INVESTMENT_ACTIVE &&
                investment_category === IInvestmentCategory.FIXED
            ) {
                const accumulatedReturns = computeAccumulatedReturns({
                    duration: hourDifference / duration_difference,
                    amount: Number(amount),
                    roi: Number(listing?.returns),
                });

                const current_value =
                    Number(amount) +
                    formatDecimal(Number(accumulatedReturns), 100);

                accumulatedArr.push({
                    _id: _id,
                    amount,
                    project_name: listing?.project_name,
                    project_image: listing?.project_image,
                    project_location: listing?.location,
                    amount_invested: formatDecimal(Number(amount), 100),
                    auto_reinvest: auto_reinvest,
                    accumulated_returns: formatDecimal(
                        Number(accumulatedReturns),
                        100
                    ),
                    current_value,
                });
            }
        }

        const portfolio_current_value = accumulatedArr.reduce(
            (accumulator: number, e: { current_value: number }) => {
                return accumulator + Number(e.current_value);
            },
            0
        );

        const portfolio_returns = accumulatedArr.reduce(
            (accumulator: number, e: { accumulated_returns: number }) => {
                return accumulator + Number(e.accumulated_returns);
            },
            0
        );

        // Calculate portfolio returns

        const total_amount_invested = accumulatedArr.reduce(
            (accumulator: number, e: { amount: number }) => {
                return accumulator + Number(e.amount);
            },
            0
        );

        // Return success response with necessary details about plan
        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Successfully fetched portfolio details",
            data: {
                type_of_portfolio: portfolio.investment_category,
                portfolio_status: portfolio.plan_status,
                portfolio_currency: portfolio.plan_currency,
                total_amount_invested: formatDecimal(
                    total_amount_invested,
                    100
                ),
                portfolio_current_value: formatDecimal(
                    portfolio_current_value,
                    100
                ),
                portfolio_returns: formatDecimal(portfolio_returns, 100),
                date_created: portfolio.start_date,
                real_estate_asset: investments?.length,
                portfolio_type: portfolio.plan_occurrence,
                portfolio_name: portfolio.plan_name,
                portfolio_id: portfolio._id,
                portfolios: accumulatedArr,
            },
        });
    } catch (error) {
        // Send server error notification
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Get Investment Portfolio Details Chart
export async function myInvestPortfolioDetailChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        let pipeline: any = [];
        const dateFrom = req.query.dateFrom || "Jan 1 2021";
        const dateTo = req.query.dateTo || `${Date()}`;

        const user = await userRepository.getById({ _id: auth._id });

        // Get User
        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }

        // Get Portfolio
        const getPortfolio = await portfolioIsExist(
            req,
            new Types.ObjectId(req.params.portfolio_id),
            auth
        );

        if (!getPortfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this portfolio does not exist.",
            });
        }

        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);

        let dateFilterQuery = {};

        if (dateFrom || dateTo) {
            dateFilterQuery = {
                start_date: {
                    $gte: new Date(myDateFrom),
                    $lte: new Date(myDateTo),
                },
            };
        }

        const d = new Date();
        const dateSet = d.setDate(d.getDate() - 365);

        const mFormat = getMonthsDate(
            moment(dateSet).format(),
            moment().format()
        );

        const format = {
            $substr: ["$start_date", 0, 7],
        };

        let query = [
            {
                $match: {
                    plan: getPortfolio._id,
                    investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
                },
            },
            {
                $match: dateFilterQuery,
            },
            {
                $project: {
                    date: format,
                    amount: "$amount",
                },
            },
            {
                $sort: {
                    date: -1,
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                    },
                    amount: { $sum: "$amount" },
                },
            },
            {
                $group: {
                    _id: null,
                    data: {
                        $push: {
                            date: "$_id.date",
                            amount: { $toDouble: "$amount" },
                        },
                    },
                },
            },
            {
                $project: {
                    data: {
                        $map: {
                            input: mFormat,
                            as: "e",
                            in: {
                                $let: {
                                    vars: {
                                        dateIndex: {
                                            $indexOfArray: [
                                                "$data.date",
                                                "$$e",
                                            ],
                                        },
                                    },
                                    in: {
                                        $cond: {
                                            if: { $ne: ["$$dateIndex", -1] },
                                            then: {
                                                date: "$$e",
                                                amount: {
                                                    $arrayElemAt: [
                                                        "$data.amount",
                                                        "$$dateIndex",
                                                    ],
                                                },
                                            },
                                            else: {
                                                date: "$$e",
                                                amount: 0,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$data",
            },

            {
                $sort: {
                    _id: -1,
                },
            },
            {
                $project: {
                    _id: 0,
                    data: "$data",
                },
            },
        ];

        pipeline.push(query);

        const chart: any = await Investment.aggregate(pipeline);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Successfully fetched chart",
            data: chart,
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Get Investment Portfolio Transactions
export async function myInvestPortfolioDetailTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const auth = throwIfUndefined(req.user, "req.user");
    try {
        const user = await userRepository.getById({ _id: auth._id });

        // Get User
        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this user does not exist.",
            });
        }
        // Get Portfolio
        const getPortfolio = await portfolioIsExist(
            req,
            new Types.ObjectId(req.params.portfolio_id),
            auth
        );

        if (!getPortfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this portfolio does not exist.",
            });
        }

        const investments = await transactionRepository.find({
            $and: [
                { user_id: user._id },
                { keble_transaction_type: IKebleTransactionType.INVESTMENT },
                { investment_status: IInvestmentStatus.INVESTMENT_ACTIVE },
                { entity_reference_id: req.params.portfolio_id },
            ],
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Successfully fetched portfolios transactions",
            data: investments,
        });
    } catch (error) {
        await serverErrorNotification(req, error, auth);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
