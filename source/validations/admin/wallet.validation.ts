import { NextFunction, Response } from "express";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { IWithdrawalStatus } from "../../interfaces/withdrawal-requests.interface";

export async function validateWallet(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            transaction_type: Joi.string()
                .valid("fund", "transfer", "withdrawal")
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

export async function validateWalletChart(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            transaction_type: Joi.string()
                .valid("amount_withdrawn", "amount_deposited")
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

export async function validateWalletRequest(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            status: Joi.string().valid(
                IWithdrawalStatus.PENDING,
                IWithdrawalStatus.APPROVED,
                IWithdrawalStatus.REJECTED
            ),
            // .required(),
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
