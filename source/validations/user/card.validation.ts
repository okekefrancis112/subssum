import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { IPaymentGateway } from "../../interfaces/transaction.interface";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export async function validateAddCard(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const schema = Joi.object().keys({
        platform: Joi.string()
            .valid(IPaymentGateway.FLUTTERWAVE, IPaymentGateway.PAYSTACK)
            .required(),
        card_currency: Joi.string()
            .valid(ICurrency.NGN, ICurrency.USD)
            .required(),
    });

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

export async function validateCardId(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.card_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid ID",
        });

    next();
}
