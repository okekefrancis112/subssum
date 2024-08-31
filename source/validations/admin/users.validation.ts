import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { IBlackListCategory } from "../../interfaces/user.interface";

export async function validateUserId(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.user_id)) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid User ID",
        });
    }

    next();
}

export async function validateWithdrawalId(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.withdrawal_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid Withdrawal ID",
        });

    next();
}

export async function validatePlanId(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.plan_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid Plan ID",
        });

    next();
}

export async function validateBlackList(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object()
        .keys({
            category: Joi.string()
                .valid(
                    IBlackListCategory.INVESTMENT_WITHDRAWAL_SPAM,
                    IBlackListCategory.OTHERS,
                    IBlackListCategory.SPAM_SIGN_UP,
                    IBlackListCategory.WALLET_TRANSFER
                )
                .required(),
        })
        .unknown();

    const validation = schema.validate(req.body);

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
