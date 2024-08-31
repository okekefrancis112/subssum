import { Response } from "express";
import { Types, startSession } from "mongoose";
import moment from "moment";
import { ExpressRequest } from "../../server";
import UtilFunctions, {
    export2Csv,
    throwIfAdminUserUndefined,
} from "../../util";
import ResponseHandler from "../../util/response-handler";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import investmentRepository from "../../repositories/investment.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { RATES } from "../../constants/rates.constant";
import userRepository from "../../repositories/user.repository";
import {
    oldListingIsExist,
    portfolioIsExist,
} from "../../validations/user/portfolio.validation";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
} from "../../interfaces/transaction.interface";
import {
    IPortfolioCategory,
    IPortfolioIntervals,
} from "../../interfaces/plan.interface";
import {
    createInvestPortfolio,
    topUpInvestPortfolio,
} from "../../helpers/portfolio.helper";
import listingRepository from "../../repositories/listing.repository";
import { IListingStatus } from "../../interfaces/listing.interface";
import walletRepository from "../../repositories/wallet.repository";
import transactionRepository from "../../repositories/transaction.repository";
import { IInvestmentForm } from "../../interfaces/investment.interface";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export async function getAllInvestments(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const investment = await investmentRepository.getAll(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Investments fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Investments fetched successfully",
            data: investment,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getAllAutoInvestments(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const investment = await investmentRepository.getAutoInvestment(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Investments fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Investments fetched successfully",
            data: investment,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function exportInvestment(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const investment = await investmentRepository.getAllExport(req);

        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "start_date",
            "start_time",
            "plan_name",
            "asset_name",
            "amount_invested",
            "no_tokens",
            "fx_rate",
            "asset_balance",
            "current_returns",
            "current_value",
            "maturity_date",
            "maturity_time",
            "investment_category",
            "investment_type",
            "duration",
            "channel",
            "fx_rate",
        ];

        export2Csv(res, investment, "investment", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function exportAutoInvestment(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const investment = await investmentRepository.getAllAutoExport(req);

        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "start_date",
            "start_time",
            "plan_name",
            "asset_name",
            "amount_invested",
            "investment_category",
            "reinvest",
        ];

        export2Csv(res, investment, "investment", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

export async function createPlanAdmin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const user = await userRepository.getById({
            _id: new Types.ObjectId(req.params.user_id),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!user.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        // Destructuring the request body to get the plan name, intervals, amount, plan occurrence and duration
        const {
            plan_name,
            amount,
            plan_occurrence,
            duration,
            investment_category,
        } = req.body;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: user._id,
        });

        if (!sender_wallet) {
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
        if (sender_wallet.balance < Number(amount)) {
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

        const debitPayload = {
            amount: amount,
            user_id: user._id,
            currency: ICurrency.USD,
            payment_gateway: IPaymentGateway.WALLET,
            description: `Transfer to ${plan_name}.`,
            reference,
            transaction_hash,
        };

        const planPayload = {
            user_id: user._id,
            plan_name,
            amount: Number(amount),
            listing_id: listing._id,
            investment_category,
            investment_form: IInvestmentForm.NEW_INVESTMENT,
            transaction_medium: ITransactionMedium.WALLET,
            payment_gateway: IPaymentGateway.KEBLE,
            entity_reference: IEntityReference.INVESTMENTS,
            intervals: IPortfolioIntervals.MONTHLY,
            total_amount: Number(amount),
            plan_occurrence: plan_occurrence,
            duration: duration,
            plan_category: IPortfolioCategory.INVESTMENT,
            transaction_hash,
            payment_reference: reference,
            session,
        };

        const result = await Promise.all([
            // debitWallet({ data: debitPayload, session }),
            createInvestPortfolio(planPayload),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length > 0) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        await session.commitTransaction();
        session.endSession();

        // send a top up email to the user
        await UtilFunctions.sendEmail2("investment.hbs", {
            to: user.email,
            subject: "Keble Investment Deed",
            props: {
                email: user.email,
                name: user.first_name,
                project_name: listing.project_name,
                amount: Number(amount),
                no_tokens: amount / RATES.INVESTMENT_TOKEN_VALUE,
                maturity_date: moment(
                    result[0].data.portfolio[0].end_date
                ).format("DD MMMM YYYY"),
                createdAt: new Date().toLocaleString(),
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Success!, your investment portfolio created.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function createPlanAdminBySelectedListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession();
    session.startTransaction();
    try {
        const user = await userRepository.getById({
            _id: new Types.ObjectId(req.params.user_id),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
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

        if (getPortfolio.plan_category !== IPortfolioCategory.INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This portfolio is not a ${IPortfolioCategory.INVESTMENT} investment`,
            });
        }

        const { amount, plan_occurrence, duration } = req.body;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: user._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        if (Number(amount) <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid amount. Amount must be greater than zero.",
            });
        }

        // Check if the amount is greater than the user's balance
        if (sender_wallet.balance < Number(amount)) {
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

        const listing = await listingRepository.getOne({
            _id: new Types.ObjectId(req.params.listing_id),
        });

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Listing does not exist`,
            });
        }

        if (listing.holding_period !== duration) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Listing holding period of (${listing.holding_period} months) does not match duration of (${duration} months)`,
            });
        }

        if (listing.status !== IListingStatus.ACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Listing is not active`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        const portfolioPayload = {
            user_id: user._id,
            plan: getPortfolio._id,
            amount: Number(amount),
            listing_id: listing._id,
            transaction_medium: ITransactionMedium.WALLET,
            payment_gateway: IPaymentGateway.KEBLE,
            entity_reference: IEntityReference.INVESTMENTS,
            intervals: IPortfolioIntervals.MONTHLY,
            total_amount: Number(amount),
            plan_occurrence: plan_occurrence,
            duration: duration,
            plan_category: IPortfolioCategory.INVESTMENT,
            transaction_hash,
            investment_form: IInvestmentForm.NEW_INVESTMENT,
            payment_reference: reference,
            session,
        };

        const result = await Promise.all([
            topUpInvestPortfolio(portfolioPayload),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length > 0) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

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

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Success!, your investment portfolio created.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function topUpInvestment(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession();
    session.startTransaction();
    try {
        const { amount } = req.body;

        const user = await userRepository.getById({
            _id: new Types.ObjectId(req.params.user_id),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!user.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: user._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        if (Number(amount) <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid amount. Amount must be greater than zero.",
            });
        }

        // Check if the amount is greater than the user's balance
        if (sender_wallet.balance < Number(amount)) {
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

        if (getPortfolio.plan_category !== IPortfolioCategory.INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This portfolio is not a ${IPortfolioCategory.INVESTMENT} investment`,
            });
        }

        if (amount < RATES.MINIMUM_INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
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

        // Create Top Up
        const investmentPayload: any = {
            user_id: user._id,
            plan: getPortfolio._id,
            amount: amount,
            listing_id: listing._id,
            payment_reference: reference,
            transaction_hash,
            payment_gateway: IPaymentGateway.KEBLE,
            transaction_medium: ITransactionMedium.KEBLE,
            entity_reference: IEntityReference.INVESTMENTS,
        };

        const result = await Promise.all([
            topUpInvestPortfolio(investmentPayload),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length > 0) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

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

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Investment topup successful.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/******
 *
 *
 * Get Listings ROi and Holding Period
 */
export async function getListingByOnHoldingPeriod(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = await userRepository.getById({
            _id: new Types.ObjectId(req.params.user_id),
        });
        const search = String(req.query.search) || ""; // Set the string for searching
        let filterQuery = {}; // Initialize the filter query object

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
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

        if (getPortfolio.plan_category !== IPortfolioCategory.INVESTMENT) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This portfolio is not a ${IPortfolioCategory.INVESTMENT} investment`,
            });
        }

        const listing = await listingRepository.getById(
            getPortfolio?.listing_id!
        );

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Listing not found",
            });
        }

        // Check if there is a search string and add it to the search query object
        if (search !== "undefined" && Object.keys(search).length > 0) {
            filterQuery = {
                project_name: new RegExp(search, "i"),
            };
        }

        let unique_returns = [
            {
                $match: {
                    status: IListingStatus.ACTIVE,
                    holding_period: listing.holding_period,
                    ...filterQuery,
                    // ! This is used to filter out listings that were in Keble 1.0
                    createdAt: { $gte: new Date("2023-06-13") },
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $project: {
                    holding_period: 1,
                    project_name: 1,
                },
            },
        ];
        const listings = await listingRepository.findAggregate(unique_returns);

        if (listings) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message:
                    "Listing ROI and holding period retrieved successfully.",
                data: listings,
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

export async function removeUserInvestment(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession();
    session.startTransaction();
    try {
        const investment = await investmentRepository.getOne(
            new Types.ObjectId(req.params.investment_id)
        );

        if (!investment) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Investment not found",
            });
        }

        const user = await userRepository.getById({
            _id: new Types.ObjectId(investment.user_id),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const transaction = await transactionRepository.getOne({
            transaction_id: investment.transaction_id,
        });

        if (!transaction) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "No transaction found",
            });
        }

        await investmentRepository.deleteOne({ _id: investment._id });

        await transactionRepository.deleteOne({ _id: transaction._id });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Removed investment successfully.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
