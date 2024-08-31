import { Response } from "express";
import { stringSimilarity } from "string-similarity-js";
import { startSession } from "mongoose";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import UtilFunctions, {
    formatDecimal,
    link,
    throwIfUndefined,
} from "../../util";

import {
    APP_CONSTANTS,
    DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
    DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
    DISCORD_WALLET_WITHDRAWAL_SUCCESS_DEVELOPMENT,
    DISCORD_WALLET_WITHDRAWAL_SUCCESS_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import userRepository from "../../repositories/user.repository";
import { RATES } from "../../constants/rates.constant";
import {
    IPaymentGateway,
    ITransactionMedium,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { debitWallet } from "../../helpers/wallet.helper";
import withdrawalRepository from "../../repositories/withdrawal.repository";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import { NotificationTaskJob } from "../../services/queues/producer.service";
import { paystackApiClient } from "../../integrations/paystackApiClient";
import otpRepository from "../../repositories/otp.repository";
import { INotificationCategory } from "../../interfaces/notification.interface";
import exchangeRateRepository from "../../repositories/exchange-rate.repository";
import banksRepository from "../../repositories/banks.repository";
import { IBankType } from "../../interfaces/banks.interface";
import walletRepository from "../../repositories/wallet.repository";
import { discordMessageHelper } from "../../helpers/discord.helper";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export async function requestWithdrawal(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const check_user = await userRepository.getById({ _id: user._id });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // ! This part handles the withdrawal restrictions for users without complete KYC
        if (!check_user.kyc_completed) {
            await discordMessageHelper(
                req,
                user,
                `Please complete your KYC to proceed ❌`,
                DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
                DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
                "WALLET WITHDRAWAL"
            );
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { amount, new_bank, account_details, reason } = req.body;

        let saved_bank_details;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: check_user._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        // Validate if the amount is a positive number
        if (Number(amount) <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Invalid amount. Withdrawal amount must be at least ${RATES.MINIMUM_WITHDRAWAL}.`,
            });
        }

        // Check if the amount is more than the minimal withdrawal amount
        if (Number(amount) < RATES.MINIMUM_WITHDRAWAL) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Withdrawal amount must be at least ${RATES.MINIMUM_WITHDRAWAL}.`,
            });
        }

        // Check if the amount is greater than the user's balance
        if (sender_wallet.balance < Number(amount)) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, insufficient funds.`,
            });
        }

        if (new_bank === "yes" && !account_details) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Please fill enter your account details",
            });
        }

        const { country, bank_name, bank_code, account_number } =
            account_details;

        if (
            new_bank == "yes" &&
            (!country ||
                !bank_name ||
                !bank_code ||
                !account_number ||
                !account_details)
        ) {
            let missing_field;
            if (!bank_code) {
                missing_field = "bank_code";
            } else if (!bank_name) {
                missing_field = "bank_name";
            } else if (!account_number) {
                missing_field = "account_number";
            } else if (!country) {
                missing_field = "country";
            }
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Please enter your ${missing_field}`,
            });
        } else if (new_bank == "yes") {
            const validate_bank =
                await paystackApiClient.resolve_account_number(
                    account_number,
                    bank_code
                );

            const { account_name } = validate_bank.data;

            const user_name = `${check_user.first_name} ${
                check_user.last_name
            } ${check_user.middle_name ? check_user.middle_name : ""}`;

            // Compare the account name and user name given to us
            const check_names = stringSimilarity(
                `${account_name.toLowerCase()}`,
                user_name.toLocaleLowerCase()
            );

            if (
                Number(check_names) < APP_CONSTANTS.GENERAL.LIKELINESS_THRESHOLD
            ) {
                await discordMessageHelper(
                    req,
                    user,
                    `Account name does not match the name on your profile ❌`,
                    DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
                    DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
                    "WALLET WITHDRAWAL",
                    {
                        Account_Details: account_name,
                        User_Details: user_name,
                    }
                );
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: "Account name does not match the name on your profile",
                });
            }

            saved_bank_details = {
                country: country,
                bank_name: bank_name,
                account_name: account_name,
                account_number: account_number,
            };
        } else if (new_bank == "no") {
            const get_bank = await banksRepository.getOne({
                user_id: user._id,
                primary: true,
            });
            if (!get_bank) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: "No saved banks",
                });
            }
            saved_bank_details = {
                country: get_bank.country,
                bank_name: get_bank.bank_name,
                account_name: get_bank.account_name,
                account_number: get_bank.account_number,
            };
        }

        const rate = await exchangeRateRepository.getOne({ is_default: true });

        const token: any = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            token_type: APP_CONSTANTS.TOKEN_TYPE.WITHDRAWAL,
            saved_bank_details,
            buy_fx_rate: rate?.ngn_usd_buy_rate,
            sell_fx_rate: rate?.ngn_usd_sell_rate,
            amount,
            reason,
        });

        // Save OTP
        const otp = await UtilFunctions.generateOtp({
            user_id: user._id,
            token,
        });

        await UtilFunctions.sendEmail2("withdrawal-otp.hbs", {
            to: user?.email,
            subject: "Withdrawal OTP",
            props: {
                otp: otp?.otp,
                name: user.first_name,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "OTP sent",
        });
    } catch (error: any) {
        await discordMessageHelper(
            req,
            user,
            `Server Error during withdrawal request ❌`,
            DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
            "WALLET WITHDRAWAL",
            error.message
        );
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// /******************************************************************************
//  *
//  *
//  * Verify Withdrawal Request
//  */

export async function verifyWithdrawalRequests(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const check_user = await userRepository.getById({ _id: user._id });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const { otp } = req.body;

        const otpObject = await otpRepository.verifyOtp({
            user_id: user._id,
            otp,
        });

        if (!otpObject.status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: otpObject.message,
            });
        }

        if (otpObject.token === "undefined") {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "OTP used already",
            });
        }

        const verify_token: any = await UtilFunctions.verifyToken(
            otpObject.token
        );

        if (
            verify_token.decoded.token_type !==
            APP_CONSTANTS.TOKEN_TYPE.WITHDRAWAL
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This OTP is not for withdrawal request, its for ${verify_token.decoded.token_type}, please use the correct OTP`,
            });
        }

        const {
            amount,
            saved_bank_details,
            reason,
            buy_fx_rate,
            sell_fx_rate,
        } = verify_token.decoded;

        if (amount < RATES.MINIMUM_WITHDRAWAL) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Minimum withdrawal amount is $${RATES.MINIMUM_WITHDRAWAL}`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        const withdrawal_payload = {
            user_id: user._id,
            amount: Number(amount),
            account_details: saved_bank_details,
            reason: reason ? reason : "No reason provided",
            transaction_id: reference,
            buy_fx_rate,
            sell_fx_rate,
            session,
        };

        const debit_payload = {
            user_id: user._id,
            amount: Number(amount),
            account_details: saved_bank_details,
            description: `Withdrawal request`,
            transaction_medium: ITransactionMedium.WALLET,
            currency: ICurrency.USD,
            transaction_hash,
            reference: reference,
            transaction_type: ITransactionType.WITHDRAWAL,
            payment_gateway: IPaymentGateway.WALLET,
            transaction_to: ITransactionTo.BANK,
            wallet_transaction_type: IWalletTransactionType.WITHDRAWAL,
        };

        const [debitResult, withdrawalResult] = await Promise.all([
            debitWallet({ data: debit_payload, session }),
            withdrawalRepository.create(withdrawal_payload),
        ]);

        const failedTxns = [debitResult, withdrawalResult].filter(
            (r) => r.success !== true
        );

        if (failedTxns.length) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();

            await discordMessageHelper(
                req,
                user,
                `Error during withdrawal request ❌`,
                DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
                DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
                "WALLET WITHDRAWAL",
                errors
            );

            await auditRepository.create({
                req,
                title: `Error during withdrawal request`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        await session.commitTransaction();
        session.endSession();

        await discordMessageHelper(
            req,
            user,
            `Hooray! Withdrawal request successful ✅`,
            DISCORD_WALLET_WITHDRAWAL_SUCCESS_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_SUCCESS_PRODUCTION,
            "WALLET WITHDRAWAL",
            {
                Amount: amount,
                Account_Details: saved_bank_details,
                Reason: reason,
            }
        );

        await auditRepository.create({
            req,
            title: `Withdrawal request successful`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        // Notification for receiver
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: user._id,
                title: "Withdrawal request",
                notification_category: INotificationCategory.WALLET,
                content: `$${formatDecimal(
                    Number(amount),
                    100
                )} Withdrawn to Bank account.`,
                action_link: `${link()}/wallet`,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Withdrawal request sent!",
        });
    } catch (error: any) {
        await session.commitTransaction();
        session.endSession();
        await discordMessageHelper(
            req,
            user,
            `Server Error during withdrawal request confirmation ❌`,
            DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
            "WALLET WITHDRAWAL",
            error.message
        );
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function requestWithdrawalForeignBank(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const check_user = await userRepository.getById({ _id: user._id });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // ! This part handles the withdrawal restrictions for users without complete KYC
        if (!check_user.kyc_completed) {
            await discordMessageHelper(
                req,
                user,
                `Please complete your KYC to proceed ❌`,
                DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
                DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
                "WALLET WITHDRAWAL (FOREIGN BANK)"
            );
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { amount, new_bank, account_details } = req.body;

        const reason_check =
            Object.keys(req.body.reason).length === 0 ? null : req.body.reason;

        let saved_bank_details;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: check_user._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found, please try again.`,
            });
        }

        // Validate if the amount is a positive number
        if (Number(amount) <= 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Invalid amount. Withdrawal amount must be at least ${RATES.MINIMUM_WITHDRAWAL}.`,
            });
        }

        // Check if the amount is more than the minimal withdrawal amount
        if (Number(amount) < RATES.MINIMUM_WITHDRAWAL) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Withdrawal amount must be at least ${RATES.MINIMUM_WITHDRAWAL}.`,
            });
        }

        // Check if the amount is greater than the user's balance
        if (sender_wallet.balance < Number(amount)) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, insufficient funds.`,
            });
        }

        if (new_bank === "yes" && !account_details) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Please fill enter your account details",
            });
        }

        const {
            account_type,
            bank_name,
            account_name,
            sort_code,
            swift_code,
            account_number,
            iban,
            wire_routing,
            bank_address,
        } = account_details;

        if (
            new_bank == "yes" &&
            (!account_type ||
                !bank_name ||
                !swift_code ||
                (account_type !== IBankType.USD && !sort_code) ||
                !account_number ||
                (account_type === IBankType.USD && !wire_routing) ||
                !bank_address ||
                !account_name ||
                (account_type !== IBankType.USD && !iban))
        ) {
            let missing_field;
            if (!swift_code) {
                missing_field = "swift_code";
            } else if (!bank_name) {
                missing_field = "bank_name";
            } else if (!account_number) {
                missing_field = "account_number";
            } else if (!account_type) {
                missing_field = "account_type";
            } else if (!wire_routing && account_type === "USD") {
                missing_field = "wire_routing";
            } else if (!bank_address) {
                missing_field = "bank_address";
            } else if (!account_name) {
                missing_field = "account_name";
            } else if (!iban && account_type !== IBankType.USD) {
                missing_field = "iban";
            } else if (!sort_code && account_type !== IBankType.USD) {
                missing_field = "sort";
            }
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Please enter your ${missing_field} code.`,
            });
        } else if (new_bank == "yes") {
            saved_bank_details = {
                account_type: account_type,
                bank_name: bank_name,
                account_name: account_name,
                account_number: account_number,
                iban: account_type === IBankType.USD ? null : iban,
                sort_code: account_type === IBankType.USD ? null : sort_code,
                swift_code: swift_code,
                wire_routing:
                    account_type === IBankType.USD ? wire_routing : null,
                bank_address: bank_address,
            };
        } else if (new_bank == "no") {
            const get_bank = await banksRepository.getOne({
                user_id: user._id,
                primary: true,
            });

            if (!get_bank) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: "No saved banks",
                });
            }

            saved_bank_details = {
                account_type: get_bank.account_type,
                bank_name: get_bank.bank_name,
                account_name: get_bank.account_name,
                account_number: get_bank.account_number,
                iban: get_bank?.iban || null,
                sort_code: get_bank?.sort_code || null,
                swift_code: get_bank.swift_code,
                wire_routing: get_bank?.wire_routing || null,
                bank_address: get_bank.bank_address,
            };
        }

        const rate = await exchangeRateRepository.getOne({ is_default: true });

        const token: any = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            token_type: APP_CONSTANTS.TOKEN_TYPE.WITHDRAWAL,
            saved_bank_details,
            buy_fx_rate: Number(rate?.keble_buy_rate),
            sell_fx_rate: Number(rate?.keble_sell_rate),
            amount,
            reason: reason_check,
        });

        // Save OTP
        const otp = await UtilFunctions.generateOtp({
            user_id: user._id,
            token,
        });

        await UtilFunctions.sendEmail2("withdrawal-otp.hbs", {
            to: user?.email,
            subject: "Withdrawal OTP",
            props: {
                otp: otp?.otp,
                name: user.first_name,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "OTP sent",
        });
    } catch (error: any) {
        await discordMessageHelper(
            req,
            user,
            `Server Error during withdrawal request ❌`,
            DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
            "WALLET WITHDRAWAL (FOREIGN BANK)",
            error.message
        );
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function verifyWithdrawalRequestsForeignBank(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    try {
        const check_user = await userRepository.getById({ _id: user._id });

        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        const { otp } = req.body;

        const otpObject = await otpRepository.verifyOtp({
            user_id: user._id,
            otp,
        });

        if (!otpObject.status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: otpObject.message,
            });
        }

        if (otpObject.token === "undefined") {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "OTP used already",
            });
        }

        const verify_token: any = await UtilFunctions.verifyToken(
            otpObject.token
        );

        if (
            verify_token.decoded.token_type !==
            APP_CONSTANTS.TOKEN_TYPE.WITHDRAWAL
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This OTP is not for withdrawal request, its for ${verify_token.decoded.token_type}, please use the correct OTP`,
            });
        }

        const {
            amount,
            saved_bank_details,
            reason,
            buy_fx_rate,
            sell_fx_rate,
        } = verify_token.decoded;

        if (amount < RATES.MINIMUM_WITHDRAWAL) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Minimum withdrawal amount is $${RATES.MINIMUM_WITHDRAWAL}`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        const withdrawal_payload = {
            user_id: user._id,
            amount: Number(amount),
            account_details: saved_bank_details,
            reason: reason ? reason : "No reason provided",
            transaction_id: reference,
            buy_fx_rate,
            sell_fx_rate,
            session,
        };

        const debit_payload = {
            user_id: user._id,
            amount: Number(amount),
            account_details: saved_bank_details,
            description: `Withdrawal request`,
            transaction_medium: ITransactionMedium.WALLET,
            currency: ICurrency.USD,
            transaction_hash,
            reference: reference,
            transaction_type: ITransactionType.WITHDRAWAL,
            payment_gateway: IPaymentGateway.WALLET,
            transaction_to: ITransactionTo.BANK,
            wallet_transaction_type: IWalletTransactionType.WITHDRAWAL,
        };

        const [debitResult, withdrawalResult] = await Promise.all([
            debitWallet({ data: debit_payload, session }),
            withdrawalRepository.create(withdrawal_payload),
        ]);

        const failedTxns = [debitResult, withdrawalResult].filter(
            (r) => r.success !== true
        );

        if (failedTxns.length) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();

            await discordMessageHelper(
                req,
                user,
                `Error during withdrawal request ❌`,
                DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
                DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
                "WALLET WITHDRAWAL (FOREIGN BANK)",
                errors
            );

            await auditRepository.create({
                req,
                title: `Error during withdrawal request`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        await session.commitTransaction();
        session.endSession();

        await discordMessageHelper(
            req,
            user,
            `Hooray! Withdrawal request successful ✅`,
            DISCORD_WALLET_WITHDRAWAL_SUCCESS_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_SUCCESS_PRODUCTION,
            "WALLET WITHDRAWAL (FOREIGN BANKS)",
            {
                Amount: amount,
                Account_Details: saved_bank_details,
                Reason: reason,
            }
        );

        await auditRepository.create({
            req,
            title: `Withdrawal request successful`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        // Notification for receiver
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: user._id,
                title: "Withdrawal request",
                notification_category: INotificationCategory.WALLET,
                content: `$${formatDecimal(
                    Number(amount),
                    100
                )} Withdrawn to Bank account.`,
                action_link: `${link()}/wallet`,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Withdrawal request sent!",
        });
    } catch (error: any) {
        await session.commitTransaction();
        session.endSession();
        await discordMessageHelper(
            req,
            user,
            `Server Error during withdrawal request confirmation ❌`,
            DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT,
            DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION,
            "WALLET WITHDRAWAL (FOREIGN BANK)",
            error.message
        );
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
