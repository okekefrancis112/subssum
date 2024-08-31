import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import {
    IPortfolioIntervals,
    IPortfolioOccurrence,
} from "../../interfaces/plan.interface";
import {
    IPaymentGateway,
    ITransactionMedium,
} from "../../interfaces/transaction.interface";
import planRepository from "../../repositories/portfolio.repository";
import {
    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
    DISCORD_INVESTMENT_ERROR_PRODUCTION,
} from "../../constants/app_defaults.constant";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import listingRepository from "../../repositories/listing.repository";
import { IListingStatus } from "../../interfaces/listing.interface";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { serverErrorNotification, throwIfUndefined } from "../../util";
import { discordMessageHelper } from "../../helpers/discord.helper";
import { IUserDocument } from "../../interfaces/user.interface";

export async function validateCreateInvestPortfolioWallet(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            plan_name: Joi.string().required(),
            intervals: Joi.string()
                .valid(
                    IPortfolioIntervals.DAILY,
                    IPortfolioIntervals.MONTHLY,
                    IPortfolioIntervals.WEEKLY,
                    IPortfolioIntervals.NONE
                )
                .required(),
            plan_occurrence: Joi.string()
                .valid(IPortfolioOccurrence.ONE_TIME_PAYMENT)
                .required(),
            duration: Joi.number().required(),
            amount: Joi.number().required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateTopUpSavingPlanWallet(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            amount: Joi.number().required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateTopUpInvestPortfolioWallet(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            amount: Joi.number().required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validatePaymentGatewayInvestment(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            plan_name: Joi.string().required(),
            intervals: Joi.string()
                .valid(
                    IPortfolioIntervals.DAILY,
                    IPortfolioIntervals.MONTHLY,
                    IPortfolioIntervals.WEEKLY,
                    IPortfolioIntervals.NONE
                )
                .required(),
            plan_occurrence: Joi.string()
                .valid(
                    IPortfolioOccurrence.ONE_TIME_PAYMENT,
                    IPortfolioOccurrence.RECURRING
                )
                .required(),
            duration: Joi.number().required(),
            amount: Joi.number().required(),
            payment_gateway: Joi.string()
                .valid(
                    IPaymentGateway.FLUTTERWAVE,
                    IPaymentGateway.MONO,
                    IPaymentGateway.PAYSTACK,
                    IPaymentGateway.APPLE_PAY
                )
                .required(),
            channel: Joi.string()
                .valid(
                    ITransactionMedium.BANK,
                    ITransactionMedium.CARD,
                    ITransactionMedium.DIRECT_DEBIT
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateTopUpInvestPortfolio(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            amount: Joi.number().required(),
            payment_gateway: Joi.string()
                .valid(
                    IPaymentGateway.FLUTTERWAVE,
                    IPaymentGateway.MONO,
                    IPaymentGateway.PAYSTACK
                )
                .required(),
            channel: Joi.string()
                .valid(
                    ITransactionMedium.BANK,
                    ITransactionMedium.CARD,
                    ITransactionMedium.DIRECT_DEBIT
                )
                .required(),
            default_choice: Joi.string().required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateEditPortfolio(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            plan_name: Joi.string().required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateCustomSavings(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            amount: Joi.number().required(),
            goal_target: Joi.number().required(),
            interval: Joi.string()
                .valid(
                    IPortfolioIntervals.DAILY,
                    IPortfolioIntervals.WEEKLY,
                    IPortfolioIntervals.MONTHLY
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        await serverErrorNotification(req, error, user);

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export const portfolioIsExist = async (
    req: ExpressRequest,
    portfolio_id: Types.ObjectId,
    auth: IUserDocument
) => {
    const portfolio = await planRepository.getOne({ _id: portfolio_id });

    if (!portfolio) {
        // Audit
        await auditRepository.create({
            req,
            title: "Portfolio does not exist",
            name: `${auth.first_name} ${auth.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.FAILURE,
            user: auth._id,
        });

        await discordMessageHelper(
            req,
            auth,
            "Portfolio does not exist ❌",
            DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
            DISCORD_INVESTMENT_ERROR_PRODUCTION,
            "PORTFOLIO"
        );
        return false;
    } else {
        return portfolio;
    }
};

export const listingIsExist = async (
    req: ExpressRequest,
    listing_id: {
        _id: Types.ObjectId;
        project_name: string;
        location: string;
        project_image: string;
    },
    auth: IUserDocument
) => {
    const listing = await listingRepository.getOne({ _id: listing_id._id });

    if (!listing) {
        await discordMessageHelper(
            req,
            auth,
            `Listing does not exist ❌`,
            DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
            DISCORD_INVESTMENT_ERROR_PRODUCTION,
            "LISTING CHECK"
        );
        // Audit
        await auditRepository.create({
            req,
            title: "Listing does not exist",
            name: `${auth.first_name} ${auth.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.FAILURE,
            user: auth._id,
        });
        return false;
    } else {
        return listing;
    }
};

export const oldListingIsExist = async (
    req: ExpressRequest,
    duration: number,
    auth: IUserDocument
) => {
    const listing = await listingRepository.getOneOldestActiveListing({
        status: IListingStatus.ACTIVE,
        holding_period: duration,
    });

    if (!listing) {
        await discordMessageHelper(
            req,
            auth,
            `No listing of ${duration} months is available ❌`,
            DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
            DISCORD_INVESTMENT_ERROR_PRODUCTION,
            "LISTING CHECK"
        );
        // Audit
        await auditRepository.create({
            req,
            title: `No listing of ${duration} months is available`,
            name: `${auth.first_name} ${auth.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.FAILURE,
            user: auth._id,
        });
        return false;
    } else {
        return listing;
    }
};
