import { Response } from "express";
import { Types, startSession } from "mongoose";
import { ExpressRequest } from "../../server";
import { export2Csv, throwIfAdminUserUndefined } from "../../util";
import ResponseHandler from "../../util/response-handler";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import userRepository from "../../repositories/user.repository";
import banksRepository from "../../repositories/banks.repository";
import paymentRepository from "../../repositories/payment.repository";
import { IPaymentStatus } from "../../interfaces/payment.interface";
import walletRepository from "../../repositories/wallet.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import transactionRepository from "../../repositories/transaction.repository";

export async function getUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const total = await userRepository.countDoc();
        const blacklisted = await userRepository.countDocs({
            is_black_listed: true,
        });
        const users = await userRepository.getAll(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Users fetched successfully",
            data: {
                total,
                blacklisted,
                users,
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getUserWalletTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = new Types.ObjectId(req.params.user_id);

        const user = await userRepository.getById(user_id);

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const { data, pagination } =
            await walletRepository.getUserWalletTransactions(req, user_id);

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "User Wallet transactions retrieved",
            data: {
                data,
                pagination,
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function exportUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const users_data = await userRepository.getAllUsersNoPagination(req);
        const fields = [
            "created_date",
            "created_time",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "last_login_date",
            "last_login_time",
            "phone_number",
            "dob",
            "user_ref_code",
            "gender",
            "country",
            "is_diaspora",
            "id_verification",
            "id_number",
            "where_how",
            "total_amount_invested",
            "last_investment_date",
            "last_investment_time",
        ];

        export2Csv(res, users_data, "users", fields);
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: `${error}`,
        });
    }
}

export async function getUserPersonalInfo(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const user = await userRepository.getPersonalInfoById(
            new Types.ObjectId(user_id)
        );
        const user_wallet = await walletRepository.getByUserId({
            user_id: new Types.ObjectId(user_id),
        });
        const user_wallet_account_number = user_wallet?.wallet_account_number;
        const banks = await banksRepository.getAll({ user_id: user_id });

        if (user) {
            // Audit
            await auditRepository.create({
                req,
                title: "User personal info fetched successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            const user_object = {
                first_name: user.first_name || "",
                middle_name: user.middle_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                phone_number: user.phone_number || "",
                dob: user.dob || "",
                profile_photo: user.profile_photo || "",
                gender: user.gender || "",
                country: user.country! || "",
                is_diaspora: user.is_diaspora || "",
                createdAt: user?.createdAt! || "",
                address: user.address || "",
                user_ref_code: user.user_ref_code || "",
                where_how: user.where_how || "",
            };

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User personal info fetched successfully",
                data: {
                    user_wallet_account_number,
                    user: user_object,
                    banks,
                },
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

export async function getUserNextOfKinInfo(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const user = await userRepository.getNextOfKin(
            new Types.ObjectId(user_id)
        );

        // Audit
        await auditRepository.create({
            req,
            title: "User next-of-kin info fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "User next-of-kin info fetched successfully",
            data: user,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getUserWalletDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const { data, pagination } =
            await transactionRepository.findPaginatedWalletTransactionDetails(
                req,
                new Types.ObjectId(user_id)
            );

        const wallet_balance = await walletRepository.getByUserId({
            user_id: new Types.ObjectId(user_id),
        });

        if (data) {
            // Audit
            await auditRepository.create({
                req,
                title: "User payments info fetched",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User payments info fetched",
                data: {
                    totalWalletBalance:
                        Math.floor(wallet_balance?.balance! * 100) / 100 || 0,
                    data,
                    pagination,
                },
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

export async function exportUserWalletDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { user_id } = req.params;
        const users_data =
            await transactionRepository.findWalletTransactionDetailsNoPagination(
                req,
                new Types.ObjectId(user_id)
            );
        const fields = [
            "amount",
            "transaction_category",
            "transaction_medium",
            "transaction_type",
            "payment_gateway",
            "transaction_status",
            "description",
            "created_date",
            "created_time",
        ];

        export2Csv(res, users_data, "users", fields);
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: `${error}`,
        });
    }
}

export async function deleteUser(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const get_user = await userRepository.getById(
            new Types.ObjectId(user_id)
        );

        if (!get_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const delete_user = await userRepository.softDeleteUser({
            _id: get_user._id,
        });

        if (delete_user) {
            // Audit
            await auditRepository.create({
                req,
                title: "User deleted successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User deleted successfully",
                data: delete_user,
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

// ! NOT TO BE TAMPERED WITH

export async function hardDeleteUser(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const get_user = await userRepository.getById(
            new Types.ObjectId(user_id)
        );

        if (!get_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const check_payment = await paymentRepository.getAllUserpayments({
            user_id: get_user._id,
            payment_status: { $ne: IPaymentStatus.COMPLETE },
        });

        if (check_payment.length > 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Action not successful, this user still have active investments`,
            });
        }

        const get_wallet = await walletRepository.getByUserId({
            user_id: get_user._id,
        });

        if (get_wallet) {
            if (get_wallet.balance > 0) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Action not successful, this user still have a left over wallet balance`,
                });
            }
        }

        const delete_wallet = await walletRepository.deleteWallet({
            _id: get_wallet?._id,
        });

        if (delete_wallet) {
            const user = await userRepository.deleteUser(
                new Types.ObjectId(user_id)
            );
            if (user) {
                // Audit
                await auditRepository.create({
                    req,
                    title: "User deleted successfully",
                    name: `${admin_user.first_name} ${admin_user.last_name}`,
                    activity_type: IAuditActivityType.ACCESS,
                    activity_status: IAuditActivityStatus.SUCCESS,
                    user: admin_user._id,
                });

                return ResponseHandler.sendSuccessResponse({
                    res,
                    code: HTTP_CODES.OK,
                    message: "User deleted successfully",
                    data: user,
                });
            }
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
 * Edit User
 */

export async function editUser(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { user_id } = req.params;
        const user = await userRepository.getById(new Types.ObjectId(user_id));

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }
        Object.keys(req.body).forEach((e: string) => {
            if (
                req.body[e] === "" ||
                req.body[e] === "null" ||
                req.body[e] === "undefined" ||
                req.body[e] === "Invalid Date" ||
                req.body[e] === "invalid"
            ) {
                delete req.body[e];
            }
        });

        const update_user = await userRepository.atomicUpdate(
            new Types.ObjectId(user_id),
            {
                ...req.body,
                kyc_percent: 50,
            }
        );

        if (update_user) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Your details have been successfully updated.",
                data: user,
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
