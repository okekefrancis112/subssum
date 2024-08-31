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
import planRepository from "../../repositories/portfolio.repository";
import { IPortfolioStatus } from "../../interfaces/plan.interface";
import walletRepository from "../../repositories/wallet.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import investmentRepository from "../../repositories/investment.repository";
import transactionRepository from "../../repositories/transaction.repository";
import { Blacklist } from "../../models";

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

export async function getUserPlans(
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

        let totalInvestUSD: number = 0;
        let totalPortfolioValue: number = 0;
        let totalTokens: number = 0;
        let totalAssets: number = 0;

        const { data, pagination }: any = await planRepository.findV4(
            req,
            new Types.ObjectId(user_id)
        );

        if (data) {
            data.forEach((e: any) => {
                // Check if the plan category is investment
                totalInvestUSD += Number(e.total_amount);
                totalTokens += Number(e.no_tokens);
                totalPortfolioValue += Number(e.current_value);
                totalAssets += Number(e.assets);
            });

            // Audit
            await auditRepository.create({
                req,
                title: "User plans info fetched successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User plans info fetched successfully",
                data: {
                    totalInvestUSD,
                    accumulatedTokens: parseFloat(totalTokens.toFixed(3)),
                    accumulatedPortfolioValue: parseFloat(
                        totalPortfolioValue.toFixed(3)
                    ),
                    accumulatedPlans: pagination.total,
                    totalAssets: parseFloat(totalAssets.toFixed(3)),
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

export async function exportUserPlans(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { user_id } = req.params;
        const users_data = await planRepository.findV4NoPagination(
            req,
            new Types.ObjectId(user_id)
        );
        const fields = [
            "created_date",
            "created_time",
            "plan_name",
            "plan_occurrence",
            "investment_category",
            "plan_status",
            "assets",
            "current_returns",
            "current_value",
            "no_tokens",
            "total_amount",
            "currency",
            "holding_period",
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

export async function getUserPlanInvestmentsDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id, plan_id } = req.params;
        let totalInvestUSD = 0;
        let totalAssets = new Set();

        if (!user_id) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "User ID is required",
            });
        }

        const plan = await planRepository.getOne(new Types.ObjectId(plan_id));
        const { data, pagination } = await investmentRepository.findV5(
            req,
            new Types.ObjectId(user_id),
            new Types.ObjectId(plan_id),
            plan?.investment_category
        );

        if (data) {
            data.forEach((e: any) => {
                // Check if the plan category is investment
                totalInvestUSD += Number(e.amount_invested);
                totalAssets.add(e.name_of_asset);
            });

            // Audit
            await auditRepository.create({
                req,
                title: "User plans info fetched",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User plans info fetched",
                data: {
                    totalInvestUSD,
                    totalAssets: totalAssets.size,
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

export async function exportUserPlanInvestmentsDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { user_id, plan_id } = req.params;
        const plan = await planRepository.getOne(new Types.ObjectId(plan_id));
        const users_data = await investmentRepository.findV5NoPagination(
            req,
            new Types.ObjectId(user_id),
            new Types.ObjectId(plan_id),
            plan?.investment_category
        );
        const fields = [
            "plan_name",
            "start_date",
            "start_time",
            "name_of_asset",
            "amount_invested",
            "currency",
            "current_returns",
            "cash_dividends",
            "current_value",
            "expected_payout",
            "maturity_date",
            "maturity_time",
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
                title: "User plans info fetched",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "User plans info fetched",
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

        const check_portfolio = await planRepository.getAllUserPlans({
            user_id: get_user._id,
            plan_status: { $ne: IPortfolioStatus.COMPLETE },
        });

        if (check_portfolio.length > 0) {
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

export async function blackListUser(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = await userRepository.getById(
            new Types.ObjectId(req.params.user_id)
        );

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const {
            category,
            can_withdraw,
            is_disabled,
            can_send_to_friend,
            can_invest,
            can_refer,
        }: {
            category: string;
            can_withdraw: boolean;
            is_disabled: boolean;
            can_send_to_friend: boolean;
            can_invest: boolean;
            can_refer: boolean;
        } = req.body;

        const reason_check =
            Object.keys(req.body.reason).length === 0 ? null : req.body.reason;

        const update = await userRepository.atomicUpdate(user._id, {
            $set: {
                is_black_listed: true,
                blacklist_category: category,
                is_disabled,
                can_withdraw,
                can_send_to_friend,
                can_refer,
                can_invest,
                blacklist_reason: reason_check,
            },
        });

        await Blacklist.create({
            user_id: user._id,
            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
            },
            blacklist_category: category,
            blacklist_reason: reason_check,
            is_disabled,
            can_withdraw,
            can_send_to_friend,
            can_refer,
            can_invest,
        });

        if (!update) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Something happened while processing request",
            });
        }

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Successful",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function blackListMultipleUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const { users }: { users: string[] } = req.body;

        const processUsers = await Promise.all(
            users.map(async (userId) => {
                const user = await userRepository.getById(
                    new Types.ObjectId(userId)
                );

                if (!user) {
                    return {
                        success: false,
                        message: `User with ID => ${userId} does not exist`,
                    };
                }

                const {
                    category,
                    can_withdraw,
                    is_disabled,
                    can_send_to_friend,
                    can_invest,
                    can_refer,
                }: {
                    category: string;
                    can_withdraw: boolean;
                    is_disabled: boolean;
                    can_send_to_friend: boolean;
                    can_invest: boolean;
                    can_refer: boolean;
                } = req.body;

                const reasonCheck =
                    Object.keys(req.body.reason).length === 0
                        ? null
                        : req.body.reason;

                await userRepository.atomicUpdate(
                    user._id,
                    {
                        $set: {
                            is_black_listed: true,
                            blacklist_category: category,
                            is_disabled,
                            can_withdraw,
                            can_send_to_friend,
                            can_refer,
                            can_invest,
                            blacklist_reason: reasonCheck,
                        },
                    },
                    session
                );

                await Blacklist.create(
                    [
                        {
                            user_id: user._id,
                            user: {
                                first_name: user.first_name,
                                last_name: user.last_name,
                                email: user.email,
                            },
                            blacklist_category: category,
                            blacklist_reason: reasonCheck,
                            is_disabled,
                            can_withdraw,
                            can_send_to_friend,
                            can_refer,
                            can_invest,
                        },
                    ],
                    { session }
                );

                return {
                    success: true,
                    message: "Successful",
                };
            })
        );

        const failedProcess = processUsers.filter((r) => r.success !== true);

        if (failedProcess.length > 0) {
            const errors = failedProcess.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `${errors}`,
            });
        }

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Successful",
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getBlacklistedUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { data, pagination } =
            await userRepository.getAllBlacklistedUsers(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Users fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Users fetched successfully",
            data: { data, pagination },
        });
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
 * Fetch Single BlackListed User
 */

export async function getSingleBlacklistedUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const user = await userRepository.getBlacklistedUserById({
            _id: new Types.ObjectId(req.params.user_id),
        });

        // Audit
        await auditRepository.create({
            req,
            title: "Users fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Users fetched successfully",
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

export async function getBlacklistedHistory(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { data, pagination } =
            await userRepository.getBlacklistedUserHistory(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Users fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Users fetched successfully",
            data: { data, pagination },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function exportBlacklistedUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const users_data =
            await userRepository.getAllBlackListedUsersNoPagination(req);
        const fields = [
            "first_name",
            "last_name",
            "email",
            "blacklist_reason",
            "is_black_listed",
            "blacklist_category",
            "is_disabled",
            "can_withdraw",
            "can_send_to_friend",
            "can_invest",
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

export async function exportBlacklistedUserHistory(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const users_data =
            await userRepository.getBlacklistedUserHistoryNoPagination(req);
        const fields = [
            "user.first_name",
            "user.last_name",
            "user.email",
            "blacklist_reason",
            "blacklist_category",
            "is_disabled",
            "can_withdraw",
            "can_send_to_friend",
            "can_invest",
            "can_refer",
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

export async function whiteListUser(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = await userRepository.getById(
            new Types.ObjectId(req.params.user_id)
        );

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const update = await userRepository.atomicUpdate(user._id, {
            $set: {
                is_black_listed: false,
                is_disabled: false,
                can_withdraw: true,
                can_send_to_friend: true,
                can_refer: true,
                can_invest: true,
            },
        });

        if (!update) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Something happened while processing request",
            });
        }

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Successful",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function whiteListMultipleUsers(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const { users }: { users: string[] } = req.body;

        const processUsers = await Promise.all(
            users.map(async (userId) => {
                const user = await userRepository.getById(
                    new Types.ObjectId(userId)
                );

                if (!user) {
                    return {
                        success: false,
                        message: `User with ID => ${userId} does not exist`,
                    };
                }

                await userRepository.atomicUpdate(
                    user._id,
                    {
                        $set: {
                            is_black_listed: false,
                            is_disabled: false,
                            can_withdraw: true,
                            can_send_to_friend: true,
                            can_refer: true,
                            can_invest: true,
                        },
                    },
                    session
                );

                return {
                    success: true,
                    message: "Successful",
                };
            })
        );

        const failedProcess = processUsers.filter((r) => r.success !== true);

        if (failedProcess.length > 0) {
            const errors = failedProcess.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `${errors}`,
            });
        }

        await session.commitTransaction();
        session.endSession();

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Successful",
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
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
