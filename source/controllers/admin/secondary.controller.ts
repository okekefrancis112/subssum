import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { IAuditActivityType, IAuditActivityStatus } from "../../interfaces/audit.interface";
import auditRepository from "../../repositories/audit.repository";
import { ExpressRequest } from "../../server";
import { throwIfAdminUserUndefined, export2Csv } from "../../util";
import ResponseHandler from "../../util/response-handler";
import secondaryRepository from "../../repositories/secondary.repository";
import { Response } from "express";
import transactionRepository from "../../repositories/transaction.repository";

/****
 *
 *
 * Get all Secondary markets
 */
export async function getSecondaryMarkets(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const investment = await secondaryRepository.getSecondaryInvestments(req);

        if (investment) {
            // Audit
            await auditRepository.create({
                req,
                title: "Secondary-investments fetched successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Secondary-investments fetched successfully",
                data: investment,
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

/****
 *
 *
 * Get Single Secondary market
 */

export async function getSingleSecondaryMarket(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const investment = await secondaryRepository.getSingleSecondaryInvestment(req);

        if (investment) {
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
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Export Secondary markets
 */

export async function exportSecondaryMarkets(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const secondary = await secondaryRepository.getExport(req);

        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "investment_category",
            "investment_amount",
            "plan_name",
            "asset_name",
            "charge",
            "reason",
            "payout_amount"
        ];

        export2Csv(res, secondary, "secondary_market", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

/****
 *
 *
 * Update Secondary market statues
 */

export async function updateSecondaryStatus(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { status } = req.body;
        const { transaction_id } = req.params;

        const secondary = await secondaryRepository.getOne({transaction_id: transaction_id});
        const tx = await transactionRepository.getOne({
            _id: transaction_id,
        });

         // Check if transaction exists
         if (!tx) {
            // Send an appropriate response and error message if the transaction does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Transaction does not exist`,
            });
        }

        // Check if secondary market exists
        if (!secondary) {
            // Send an appropriate response and error message if the secondary market does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Secondary market does not exist`,
            });
        }

        if (tx?.transaction_status === status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `Sorry, this status has already been set to ${tx?.transaction_status}.`,
            });
        }

        const update_status = await secondaryRepository.atomicUpdate(
            secondary._id,
            {
                $set: {
                    transaction_status: status,
                },
            }
        );

        // Update the secondary market status on the user end also
        await transactionRepository.atomicUpdate(tx?._id, {
            $set: {
                transaction_status: status,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "Exchange Rate updated successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.AUDIT,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message:
                "Success! This secondary market status is set.",
            data: update_status,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
