import { Response } from "express";
import moment from "moment";
import { ExpressRequest } from "../../server";
import { Types } from "mongoose";
import { formatDecimal, getPercent, throwIfUndefined } from "../../util";
import ResponseHandler from "../../util/response-handler";
import userRepository from "../../repositories/user.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import investmentRepository from "../../repositories/investment.repository";
import { listingIsExist } from "../../validations/user/portfolio.validation";
import walletRepository from "../../repositories/wallet.repository";

import {
    IInvestmentDocument,
    IInvestmentStatus,
} from "../../interfaces/investment.interface";
import listingRepository from "../../repositories/listing.repository";
import personalizeMessageRepository from "../../repositories/personalize-message.repository";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { IInvestmentCategory } from "../../interfaces/plan.interface";

/**
 * Get User Overview
 *
 * This function is used to get the user overview which includes net worth, accumulated investments, accumulated savings and accumulated tokens.
 * It also returns the user profile and user plan.
 *
 * @param {ExpressRequest} req - Express request object
 * @param {Response} res - Express response object
 *
 * @returns {Promise<Response | void>} - Returns a promise that resolves with a response object or void if an error occurs
 */
export async function getUserOverview(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user"); // Throw an error if req.user is undefined

        const getUser = await userRepository.getById({ _id: user._id }); // Get the user by id

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                // Return an error response if the user does not exist
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        // Get the investments for the user
        const investments = await investmentRepository.find(
            {
                $and: [
                    {
                        user_id: getUser._id,
                        investment_currency: ICurrency.USD,
                        investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
                    },
                ],
            },
            "listing_id"
        );

        // Initialize portfolio value array and listings array
        const portfolio_value_array = [];
        const listings_set = new Set();

        for (const investment of investments as IInvestmentDocument[]) {
            const {
                listing_id,
                amount,
                start_date,
                end_date,
                investment_category,
            }: IInvestmentDocument = investment;

            const listing = await listingRepository.getOne({ _id: listing_id });

            const hourDifference = moment().diff(start_date, "hour", true);
            const duration_difference = moment(end_date).diff(
                new Date(start_date),
                "hour",
                true
            );

            // Push the listing id into the listings array
            if (listing) {
                listings_set.add(String(listing._id));
            }

            // Calculate returns only if listing is defined and has the 'returns' property
            let listing_return;

            if (listing && typeof listing.returns === "number") {
                if (investment_category === IInvestmentCategory.FIXED) {
                    listing_return =
                        isNaN(listing.returns) || listing.returns === 0
                            ? listing?.fixed_returns
                            : listing.returns;
                } else if (
                    investment_category === IInvestmentCategory.FLEXIBLE
                ) {
                    listing_return =
                        isNaN(listing.returns) || listing.returns === 0
                            ? listing?.flexible_returns
                            : listing.returns;
                }

                const returns =
                    Number(amount) * getPercent(Number(listing_return));
                const accumulatedReturns =
                    (hourDifference / duration_difference) * returns;
                const total =
                    formatDecimal(accumulatedReturns, 100) + Number(amount);

                // Push the total into the portfolio value array
                portfolio_value_array.push(total);
            }
        }

        // Calculate the portfolio value
        // const portfolio_value = portfolio_value_array.reduce(
        //     (accumulator: number, e: any) => {
        //         return Number(accumulator) + Number(e);
        //     },
        //     0
        // );

        // Get the wallet balance
        const wallet = await walletRepository.getByUserId({
            user_id: user._id,
        });

        // Calculate the total tokens
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

        // Get the unique listings count
        const count = listings_set.size;

        const plans = await investmentRepository.getPlans(user._id);
        const portfolio_value = plans.reduce((accumulator: number, e: any) => {
            return Number(accumulator) + Number(e.current_value);
        }, 0);

        return ResponseHandler.sendSuccessResponse({
            // Return a success response
            res,
            code: HTTP_CODES.OK,
            message: "Your overview has been successfully retrieved.",
            data: {
                portfolio_value: formatDecimal(portfolio_value, 100),
                wallet_balance: wallet && formatDecimal(wallet?.balance, 100),
                total_tokens: formatDecimal(tokens!, 100),
                assets: count,
                userPlan: plans,
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            // Return an error response
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// This function is used to get the overview plan return chart for a user
export async function getOverviewPlanReturnChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        // Get the user from the request
        const user = throwIfUndefined(req.user, "req.user");

        // Get the user from the repository
        const getUser = await userRepository.getById({ _id: user._id });

        // If the user does not exist, send an error response
        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        // Get the investment chart from the repository
        const investment_chart = await investmentRepository.investment_chart(
            new Types.ObjectId(user._id)
        );

        // Send a success response with the investment chart data
        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your overview chart has been successfully retrieved",
            data: investment_chart,
        });
    } catch (error) {
        // If an error occurs, send an error response
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Get Personalize Message
export async function personalizeMessage(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const message = await personalizeMessageRepository.getOne({ is_default: true });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Successfully fetched personalize messages",
            data: message,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
