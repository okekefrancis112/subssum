import { Response } from "express";
import mongoose, { Types } from "mongoose";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import walletRepository from "../../repositories/wallet.repository";
import UtilFunctions, {
    export2Csv,
    link,
    throwIfAdminUserUndefined,
} from "../../util";
import withdrawalRepository from "../../repositories/withdrawal.repository";
import transactionRepository from "../../repositories/transaction.repository";
import userRepository from "../../repositories/user.repository";
import {
    WALLET_STATUS,
    WALLET_TOPUP_CATEGORIES,
} from "../../interfaces/wallet.interface";
import {
    IPaymentGateway,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { creditWallet, debitWallet } from "../../helpers/wallet.helper";
import { INotificationCategory } from "../../interfaces/notification.interface";
import { NotificationTaskJob } from "../../services/queues/producer.service";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityType,
    IAuditActivityStatus,
} from "../../interfaces/audit.interface";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export async function getWalletBalance(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } = await walletRepository.getWalletBalance(
            req
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallet balance retrieved",
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

export async function getWalletSavings(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } = await walletRepository.getAllWalletSavings(
            req
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallets savings retrieved",
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

export async function getWalletTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } =
            await walletRepository.getAllWalletTransactions(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallets transactions retrieved",
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

export async function getWalletRequestTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { data, pagination } = await walletRepository.getAllWalletRequests(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallets requests transactions retrieved",
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

export async function getWalletChart(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const data = await walletRepository.walletChart({ req });

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallets transactions chart retrieved",
            data: data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getWalletCards(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const data = await walletRepository.walletCards();

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Wallets cards retrieved",
            data: data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getUserWalletById(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { user_id } = req.params;

        const data = await walletRepository.getAllUserWalletTransactions(
            req,
            new Types.ObjectId(user_id)
        );

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "User wallet transactions retrieved",
            data: data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getSingleWithdrawal(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { transaction_id } = req.params;

        const check_transaction =
            await transactionRepository.getOneByPaymentReference(
                transaction_id
            );

        if (!check_transaction) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Transaction not found",
            });
        }
        const check_withdrawal =
            await withdrawalRepository.getOneByTransactionId(transaction_id);

        if (!check_withdrawal) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Withdrawal not found",
            });
        }

        const wallet = await walletRepository.getByUserId({
            user_id: new Types.ObjectId(check_transaction.user_id),
        });

        const data = {
            transaction_id: check_transaction._id,
            amount: Number(check_transaction.amount),
            reason: check_withdrawal.reason,
            account_details: check_withdrawal.account_details,
            balance: Math.floor(Number(wallet?.balance) * 100) / 100,
            balance_before:
                Math.floor(Number(wallet?.balance_before) * 100) / 100,
            status: check_withdrawal.status,
            buy_rate: check_withdrawal.buy_fx_rate,
            sell_rate: check_withdrawal.sell_fx_rate,
        };

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Withdrawal retrieved",
            data: data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Endpoint to fund wallets from the admin dashboard

export async function fundUserWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;
        const { amount, category, note } = req.body;

        const check_user = await userRepository.getById({
            _id: new Types.ObjectId(user_id),
        });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const get_wallet = await walletRepository.getByUserId({
            user_id: new Types.ObjectId(user_id),
        });

        if (!get_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet not found",
            });
        }

        if (get_wallet.status === WALLET_STATUS.INACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet is inactive",
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        try {
            const creditPayload: any = {
                amount: amount,
                note: note,
                user_id: check_user._id,
                currency: ICurrency.USD,
                payment_gateway: IPaymentGateway.KEBLE,
                reference: reference,
                transaction_hash: transaction_hash,
                wallet_transaction_type:
                    IWalletTransactionType.INTEREST_RECEIVED,
                description:
                    category === WALLET_TOPUP_CATEGORIES.INVESTMENT
                        ? `Investment proceeds.`
                        : category === WALLET_TOPUP_CATEGORIES.WALLET_FUNDING
                        ? `Wallet Top Up.`
                        : `Referral proceeds.`,
            };

            const result = await creditWallet({ data: creditPayload, session });

            if (!result.success) {
                await session.abortTransaction();

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your transactions have been canceled.",
                });
            }

            // This checks the balance of the user's wallet
            const balance =
                Math.floor(Math.abs(get_wallet?.balance + amount) * 100) / 100;

            // send a top up email to the user
            await UtilFunctions.sendEmail2("fund-wallet.hbs", {
                to: check_user.email,
                subject: "Keble Wallet Top Up",
                props: {
                    email: check_user.email,
                    name: check_user.first_name,
                    balance: balance,
                    amount: amount,
                    createdAt: new Date().toLocaleString(),
                },
            });

            // Notification for funding
            await NotificationTaskJob({
                name: "User Notification",
                data: {
                    user_id: new Types.ObjectId(user_id),
                    title: "Wallet Funding",
                    notification_category: INotificationCategory.WALLET,
                    content: `Top up  Wallet`,
                    action_link: `${link()}/wallet`,
                },
            });

            await session.commitTransaction();
            await session.endSession();

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
                message: "Hooray! Transaction successful.",
            });
        } catch (error) {
            await session.abortTransaction();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                error: `${error}`,
            });
        } finally {
            await session.endSession();
        }
    } catch (error) {
        await session.abortTransaction();
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function debitUserWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { user_id } = req.params;
        const { amount, category, note } = req.body;

        const check_user = await userRepository.getById({
            _id: new Types.ObjectId(user_id),
        });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const get_wallet = await walletRepository.getByUserId({
            user_id: new Types.ObjectId(user_id),
        });

        if (!get_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet not found",
            });
        }

        if (get_wallet.status === WALLET_STATUS.INACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet is inactive",
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        try {
            const debitPayload: any = {
                amount: amount,
                note: note,
                user_id: check_user._id,
                currency: ICurrency.USD,
                payment_gateway: IPaymentGateway.KEBLE,
                reference: reference,
                transaction_hash: transaction_hash,
                description:
                    category === WALLET_TOPUP_CATEGORIES.INVESTMENT
                        ? `Investment proceeds duplicate reversal.`
                        : category === WALLET_TOPUP_CATEGORIES.WALLET_FUNDING
                        ? `Wallet Top Up duplicate reversal.`
                        : `Referral proceeds duplicate reversal.`,
            };

            const result = await debitWallet({ data: debitPayload, session });

            if (!result.success) {
                await session.abortTransaction();

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your transactions have been canceled.",
                });
            }

            await session.commitTransaction();
            await session.endSession();

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Hooray! Reversal successful.",
            });
        } catch (error) {
            await session.abortTransaction();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                error: `${error}`,
            });
        } finally {
            await session.endSession();
        }
    } catch (error) {
        await session.abortTransaction();
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
 * Export Wallet Transactions
 */
export async function exportWalletTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet = await walletRepository.getAllWalletNoPagination(req);
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "amount",
            "transaction_type",
            "description",
            "wallet_balance_before",
            "wallet_balance_after",
            "channel",
            "payment_method",
        ];

        export2Csv(res, wallet, "wallet-transactions", fields);
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
 * Export Wallet Balances
 */
export async function exportWalletBalance(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet = await walletRepository.getAllWalletBalanceNoPagination(
            req
        );
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "previous_balance",
            "current_balance",
            "currency",
        ];

        export2Csv(res, wallet, "wallet-balances", fields);
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
 * Export Wallet Transactions
 */
export async function exportWalletTransaction(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet =
            await walletRepository.getAllWalletTransactionNoPagination(req);
        const fields = [
            "user.first_name",
            "user.middle_name",
            "user.last_name",
            "user.email",
            "amount",
            "previous_balance",
            "current_balance",
            "currency",
            "purpose",
            "description",
        ];
        export2Csv(res, wallet, "wallet-transactions", fields);
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
 * Export Wallet Savings
 */
export async function exportWalletSaving(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet = await walletRepository.getAllWalletSavingNoPagination(
            req
        );
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "previous_balance",
            "current_balance",
            "currency",
        ];

        export2Csv(res, wallet, "wallet-savings", fields);
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
 * Export Wallet Requests
 */
export async function exportWalletRequest(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const wallet = await walletRepository.getAllWalletRequestNoPagination(
            req
        );
        const fields = [
            "created_date",
            "created_time",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "previous_balance",
            "current_balance",
            "currency",
        ];

        export2Csv(res, wallet, "wallet-requests", fields);
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
 * Update Withdrawal-request statues
 */

export async function updateRequestStatus(
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

        const withdrawal = await withdrawalRepository.getOne(transaction_id);
        const tx = await transactionRepository.getOne({
            payment_reference: transaction_id,
        });

        // Check if withdrawal request exists
        if (!withdrawal) {
            // Send an appropriate response and error message if the withdrawal request does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Withdrawal request does not exist`,
            });
        }

        if (withdrawal.status === status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `Sorry, this status has already been set to ${withdrawal.status}.`,
            });
        }

        const update_status = await withdrawalRepository.atomicUpdate(
            withdrawal._id,
            {
                $set: {
                    status: status,
                },
            }
        );

        // Update the withdraw request status on the user end also
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
                "Success! This exchange rate is now your default exchange rate.",
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
