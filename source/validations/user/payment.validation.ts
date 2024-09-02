import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import Joi from "joi";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import {
    IPaymentIntervals,
    IPaymentOccurrence,
} from "../../interfaces/payment.interface";
import {
    IPaymentGateway,
    ITransactionMedium,
} from "../../interfaces/transaction.interface";
import paymentRepository from "../../repositories/payment.repository";
import {
    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
    DISCORD_INVESTMENT_ERROR_PRODUCTION,
} from "../../constants/app_defaults.constant";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { serverErrorNotification, throwIfUndefined } from "../../util";
import { IUserDocument } from "../../interfaces/user.interface";

export async function validateCreateInvestpaymentWallet(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            payment_name: Joi.string().required(),
            intervals: Joi.string()
                .valid(
                    IPaymentIntervals.DAILY,
                    IPaymentIntervals.MONTHLY,
                    IPaymentIntervals.WEEKLY,
                    IPaymentIntervals.NONE
                )
                .required(),
            payment_occurrence: Joi.string()
                .valid(IPaymentOccurrence.ONE_TIME_PAYMENT)
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

export async function validateTopUpSavingpaymentWallet(
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

export async function validateTopUpInvestpaymentWallet(
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
            payment_name: Joi.string().required(),
            intervals: Joi.string()
                .valid(
                    IPaymentIntervals.DAILY,
                    IPaymentIntervals.MONTHLY,
                    IPaymentIntervals.WEEKLY,
                    IPaymentIntervals.NONE
                )
                .required(),
            payment_occurrence: Joi.string()
                .valid(
                    IPaymentOccurrence.ONE_TIME_PAYMENT,
                    IPaymentOccurrence.RECURRING
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

export async function validateTopUpInvestpayment(
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

export async function validateEditpayment(
    req: ExpressRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const schema = Joi.object()
        .keys({
            payment_name: Joi.string().required(),
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
                    IPaymentIntervals.DAILY,
                    IPaymentIntervals.MONTHLY,
                    IPaymentIntervals.WEEKLY,
                    IPaymentIntervals.NONE
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

export const paymentIsExist = async (
    req: ExpressRequest,
    payment_id: Types.ObjectId,
    auth: IUserDocument
) => {
    const payment = await paymentRepository.getOne({ _id: payment_id });

    if (!payment) {
        // Audit
        await auditRepository.create({
            req,
            title: "payment does not exist",
            name: `${auth.first_name} ${auth.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.FAILURE,
            user: auth._id,
        });
        return false;
    } else {
        return payment;
    }
};

// export const listingIsExist = async (
//     req: ExpressRequest,
//     listing_id: {
//         _id: Types.ObjectId;
//         project_name: string;
//         location: string;
//         project_image: string;
//     },
//     auth: IUserDocument
// ) => {
//     const listing = await listingRepository.getOne({ _id: listing_id._id });

//     if (!listing) {
//         await discordMessageHelper(
//             req,
//             auth,
//             `Listing does not exist ❌`,
//             DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
//             DISCORD_INVESTMENT_ERROR_PRODUCTION,
//             "LISTING CHECK"
//         );
//         // Audit
//         await auditRepository.create({
//             req,
//             title: "Listing does not exist",
//             name: `${auth.first_name} ${auth.last_name}`,
//             activity_type: IAuditActivityType.ACCESS,
//             activity_status: IAuditActivityStatus.FAILURE,
//             user: auth._id,
//         });
//         return false;
//     } else {
//         return listing;
//     }
// };

// export const oldListingIsExist = async (
//     req: ExpressRequest,
//     duration: number,
//     auth: IUserDocument
// ) => {
//     const listing = await listingRepository.getOneOldestActiveListing({
//         status: IListingStatus.ACTIVE,
//         holding_period: duration,
//     });

//     if (!listing) {
//         await discordMessageHelper(
//             req,
//             auth,
//             `No listing of ${duration} months is available ❌`,
//             DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
//             DISCORD_INVESTMENT_ERROR_PRODUCTION,
//             "LISTING CHECK"
//         );
//         // Audit
//         await auditRepository.create({
//             req,
//             title: `No listing of ${duration} months is available`,
//             name: `${auth.first_name} ${auth.last_name}`,
//             activity_type: IAuditActivityType.ACCESS,
//             activity_status: IAuditActivityStatus.FAILURE,
//             user: auth._id,
//         });
//         return false;
//     } else {
//         return listing;
//     }
// };
