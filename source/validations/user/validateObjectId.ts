import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";

const validateObjectId = function (
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.payment_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid ID",
        });

    next();
};

const validatepaymentObjectId = function (
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.payment_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid payment ID",
        });

    next();
};

const validateInvestObjectId = function (
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!mongoose.Types.ObjectId.isValid(req.params.investment_id))
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "Invalid Investment ID",
        });

    next();
};

export default {
    validateObjectId,
    validateInvestObjectId,
    validatepaymentObjectId,
};
