import { NextFunction, Response } from "express";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { IGenderType, IWhereHow } from "../../interfaces/user.interface";
import {
    IInvestmentCategory,
    IPortfolioOccurrence,
} from "../../interfaces/plan.interface";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { ITransactionMedium } from "../../interfaces/transaction.interface";

export async function validateGenderQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            gender: Joi.string()
                .valid(IGenderType.MALE, IGenderType.FEMALE, "all")
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateDiasporaQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            is_diaspora: Joi.string().valid("true", "false", "all").required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateKYCQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            kyc_completed: Joi.string()
                .valid("true", "false", "all")
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateWhereHowQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            where_how: Joi.string()
                .valid(
                    IWhereHow.ALL,
                    IWhereHow.FACEBOOK,
                    IWhereHow.FRIENDS_FAMILY,
                    IWhereHow.GOOGLE_SEARCH,
                    IWhereHow.INFLUENCERS,
                    IWhereHow.INSTAGRAM,
                    IWhereHow.LINKEDIN,
                    IWhereHow.MEDIA_PUBLICATIONS,
                    IWhereHow.TIKTOK,
                    IWhereHow.TWITTER,
                    IWhereHow.YOUTUBE,
                    IWhereHow.OTHERS
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validatePaymentStyleQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            payment_style: Joi.string()
                .valid(
                    IPortfolioOccurrence.All,
                    IPortfolioOccurrence.RECURRING,
                    IPortfolioOccurrence.ONE_TIME_PAYMENT
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validatePaymentMethodQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            payment_method: Joi.string()
                .valid(
                    "all",
                    ITransactionMedium.WALLET,
                    ITransactionMedium.BANK,
                    ITransactionMedium.CARD,
                    ITransactionMedium.DIRECT_DEBIT
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}

export async function validateInvestmentCategoryQuery(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            investment_category: Joi.string()
                .valid(
                    "all",
                    IInvestmentCategory.FIXED,
                    IInvestmentCategory.FLEXIBLE
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.query);

    if (validation.error) {
        const error = validation.error.message
            ? validation.error.message
            : validation.error.details[0].message;

        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error,
        });
    }

    return next();
}
