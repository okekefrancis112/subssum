import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ResponseHandler from "../util/response-handler";
import { ExpressRequest } from "../server";
import { SERVER_TOKEN_SECRET } from "../config/env.config";
import { HTTP_CODES } from "../constants/app_defaults.constant";

const authAdmin = (req: ExpressRequest, res: Response, next: NextFunction) => {
    const token = req.header("x-auth-token") || req.header("Authorization");
    if (!token) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.UNAUTHORIZED,
            error: "Access denied. No token provided",
        });
    }

    try {
        jwt.verify(
            token,
            `${SERVER_TOKEN_SECRET}`,
            (error: any, decoded: any) => {
                if (error) {
                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.UNAUTHORIZED,
                        error: error.message,
                    });
                } else {
                    req.admin_user = decoded;
                    next();
                }
            }
        );
    } catch (ex) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error: "Invalid Token",
        });
    }
};

export default {
    authAdmin,
};
