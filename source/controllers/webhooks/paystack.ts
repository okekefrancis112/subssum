import { Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { ExpressRequest } from "../../server";
import { PAYSTACK_SECRET_KEY } from "../../config/env.config";
import { paystackApiClient } from "../../integrations/paystackApiClient";
import ResponseHandler from "../../util/response-handler";
import webhookRepository from "../../repositories/webhook.repository";
import userRepository from "../../repositories/user.repository";
import transaction_refRepository from "../../repositories/transaction_ref.repository";
import transactionRepository from "../../repositories/transaction.repository";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionTo,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import { creditWallet } from "../../helpers/wallet.helper";
import {
    createInvestpayment,
    topUpInvestpayment,
} from "../../helpers/payment.helper";
import {
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import cardsRepository from "../../repositories/cards.repository";
import UtilFunctions, {  } from "../../util";
import walletRepository from "../../repositories/wallet.repository";
import { paymentIsExist } from "../../validations/user/payment.validation";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

export const paystackWebhook = async (req: ExpressRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { event } = req.body;
        if (event === "charge.success") {
            const hash = crypto
                .createHmac("sha512", String(PAYSTACK_SECRET_KEY))
                .update(JSON.stringify(req.body))
                .digest("hex");

            const { id, reference, metadata } = req.body.data;

            const { amount: cleanAmount } = req.body.data;
            const amount = cleanAmount ? Math.abs(cleanAmount / 100) : 0;

            if (hash !== req.headers["x-paystack-signature"]) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.UNAUTHORIZED,
                    error: "Invalid webhook signature. Please try again.",
                });
            }

            let webhook = await webhookRepository.getOne({ webhook_id: id });

            if (webhook) {
                console.log("Webhook already exist");

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: "Oops! Looks like this webhook already exists!",
                });
            }

            const user = await userRepository.getById({
                _id: metadata.user_id,
            });

            if (!user) {
                console.log("User does not exist");
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: "Sorry, this user doesn't exist in our records.",
                });
            }

            const txRefExists = await transaction_refRepository.getOne({
                transaction_hash: metadata.transaction_hash,
            });

            if (txRefExists) {
                console.log("Transaction REF exists already");
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: "Oops! Looks like we already have a transaction with that reference number.",
                });
            }

            const txExists = await transactionRepository.getOne({
                transaction_hash: metadata.transaction_hash,
            });

            if (txExists) {
                console.log("Transaction exists already");

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: "Hmm, something's not right... this transaction already exists.",
                });
            }

            const paymentRefExists = await transactionRepository.getOne({
                payment_reference: metadata.payment_reference,
            });

            if (paymentRefExists) {
                console.log("Payment reference exists already");
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: "Oops! This payment reference already exists.",
                });
            }

            const e = await paystackApiClient.verifyTransaction(reference);

            const data = e.data;

            const user_object: any = await userRepository.getById({
                _id: data.metadata.user_id,
            });

            if (!e.status) {
                const failurePayload: any = {
                    amount: amount / data.metadata.exchange_rate_value, // Convert back to dollars
                    user_id: data.metadata.user_id,
                    currency: ICurrency.USD,
                    payment_gateway: IPaymentGateway.PAYSTACK,
                    payment_reference: data.metadata.payment_reference,
                    transaction_hash: data.metadata.transaction_hash,
                    exchange_rate_value: data.metadata.exchange_rate_value,
                    exchange_rate_currency:
                        data.metadata.exchange_rate_currency,
                    ip_address: data.ip_address,
                    description: `Transaction was unsuccessful`,
                    transaction_status: ITransactionStatus.FAILED,
                    webhook_id: id,
                    data: req.body,
                };

                await transactionRepository.create(failurePayload);

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.UNAUTHORIZED,
                    error: "Sorry, payment verification failed. The transaction could not be processed.",
                });
            } else if (e.status) {
                /**************************************************************************************
                 * ************************************************************************************
                 *
                 *                            WALLET
                 *
                 * ************************************************************************************
                 * ************************************************************************************
                 */

                if (data.metadata.transaction_to == ITransactionTo.WALLET) {
                    try {
                        // Get wallet balance

                        const walletBalance =
                            await walletRepository.getByUserId({
                                user_id: user._id,
                            });

                        if (!walletBalance) {
                            await session.abortTransaction();

                            return ResponseHandler.sendErrorResponse({
                                res,
                                code: HTTP_CODES.BAD_REQUEST,
                                error: "Wallet does not exist. Your transactions have been canceled.",
                            });
                        }
                        const creditPayload: any = {
                            amount:
                                data.metadata.normal_amount /
                                data.metadata.exchange_rate_value, // Convert back to dollars...
                            user_id: data.metadata.user_id,
                            currency: ICurrency.USD,
                            payment_gateway: IPaymentGateway.PAYSTACK,
                            reference: data.metadata.payment_reference,
                            transaction_hash: data.metadata.transaction_hash,
                            exchange_rate_value:
                                data.metadata.exchange_rate_value,
                            exchange_rate_currency:
                                data.metadata.exchange_rate_currency,
                            ip_address: data.ip_address,
                            description: `Wallet Top Up.`,
                            webhook_id: id,
                            data: req.body,
                            wallet_transaction_type:
                                IWalletTransactionType.FUND_WALLET,
                        };

                        const result = await creditWallet({
                            data: creditPayload,
                            session: session,
                        });

                        if (!result.success) {
                            await session.abortTransaction();

                            return ResponseHandler.sendErrorResponse({
                                res,
                                code: HTTP_CODES.BAD_REQUEST,
                                error: "Your transactions have been canceled.",
                            });
                        }

                        const balance =
                            Math.floor(
                                Math.abs(
                                    walletBalance?.balance +
                                        amount /
                                            data.metadata.exchange_rate_value
                                ) * 100
                            ) / 100;

                        const email_amount =
                            Math.floor(
                                (data.metadata.normal_amount /
                                    data.metadata.exchange_rate_value) *
                                    100
                            ) / 100;

                        // send a top up email to the user
                        await UtilFunctions.sendEmail2("fund-wallet.hbs", {
                            to: user.email,
                            subject: "subssum Wallet Top Up",
                            props: {
                                email: user.email,
                                name: user.first_name,
                                balance: balance,
                                amount: email_amount,
                                createdAt: new Date().toLocaleString(),
                            },
                        });

                        await session.commitTransaction();
                        await session.endSession();

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.OK,
                            message: "Hooray! Transaction successful.",
                        });
                    } catch (error: any) {
                        await session.abortTransaction();

                        return ResponseHandler.sendErrorResponse({
                            res,
                            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                            error: `${error}`,
                        });
                    } finally {
                        await session.endSession();
                    }
                }

                /**************************************************************************************
                 * ************************************************************************************
                 *
                 *                            INVESTMENT
                 *
                 * ************************************************************************************
                 * ************************************************************************************
                 */

                if (
                    data.metadata.transaction_to === ITransactionTo.INVESTMENT
                ) {
                    try {
                        const paymentPayload: any = {
                            investment_category:
                                data.metadata.investment_category,
                            payment_gateway: data.metadata.payment_gateway,
                            user_id: data.metadata.user_id,
                            listing_id: data.metadata.listing_id,
                            transaction_medium: ITransactionMedium.CARD,
                            entity_reference: IEntityReference.INVESTMENTS,
                            payment_name: data.metadata.payment_name,
                            amount:
                                data.metadata.normal_amount /
                                data.metadata.exchange_rate_value,
                            intervals: data.metadata.intervals,
                            total_amount:
                                amount / data.metadata.exchange_rate_value,
                            payment_occurrence: data.metadata.payment_occurrence,
                            // investment_form: IInvestmentForm.NEW_INVESTMENT,
                            duration: data.metadata.duration,
                            transaction_hash: data.metadata.transaction_hash,
                            payment_reference: data.metadata.payment_reference,
                            exchange_rate_value:
                                data.metadata.exchange_rate_value,
                            exchange_rate_currency:
                                data.metadata.exchange_rate_currency,
                            meta_data: req.body,
                            webhook_id: id,
                            session: session,
                        };

                        // Create payment
                        const result = await createInvestpayment(paymentPayload);

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
                            message: "Hooray! Transaction successful.",
                        });
                    } catch (error: unknown | any) {
                        await session.abortTransaction();
                        await session.endSession();

                        return ResponseHandler.sendErrorResponse({
                            res,
                            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                            error: `${error}`,
                        });
                    } finally {
                        await session.endSession();
                    }
                }

                /**************************************************************************************
                 * ************************************************************************************
                 *
                 *                            INVESTMENT TOPUP
                 *
                 * ************************************************************************************
                 * ************************************************************************************
                 */

                if (
                    data.metadata.transaction_to ==
                    ITransactionTo.INVESTMENT_TOPUP
                ) {
                    try {
                        const formatted_amount =
                            data.metadata.normal_amount /
                            data.metadata.exchange_rate_value;

                        const topUpPayload = {
                            user_id: data.metadata.user_id,
                            payment: data.metadata.payment,
                            amount: formatted_amount,
                            listing_id: data.metadata.listing_id,
                            transaction_medium: ITransactionMedium.CARD,
                            entity_reference: IEntityReference.INVESTMENTS,
                            payment_gateway: data.metadata.payment_gateway,
                            transaction_hash: data.metadata.transaction_hash,
                            // investment_form:
                            //     IInvestmentForm.RECURRING_INVESTMENT,
                            payment_reference: data.metadata.payment_reference,
                            exchange_rate_value:
                                data.metadata.exchange_rate_value,
                            exchange_rate_currency:
                                data.metadata.exchange_rate_currency,
                            meta_data: req.body,
                            webhook: id,
                            session,
                        };

                        // Top Up Investment
                        const result = await topUpInvestpayment(topUpPayload);

                        if (!result.success) {
                            await session.abortTransaction();

                            console.log("Top up failed", result);
                            return ResponseHandler.sendErrorResponse({
                                res,
                                code: HTTP_CODES.BAD_REQUEST,
                                error: "Your transactions have been canceled.",
                            });
                        }

                        const getpayment = await paymentIsExist(
                            req,
                            data.metadata.payment,
                            user
                        );

                        if (!getpayment) {
                            await session.abortTransaction();

                            return ResponseHandler.sendErrorResponse({
                                res,
                                code: HTTP_CODES.NOT_FOUND,
                                error: "This payment does not exist",
                            });
                        }

                        await session.commitTransaction();
                        await session.endSession();

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.OK,
                            message: "Hooray! Transaction successful.",
                        });
                    } catch (error: any) {
                        await session.abortTransaction();
                        console.log("??????????????????????????", error);
                        return ResponseHandler.sendErrorResponse({
                            res,
                            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                            error: `${error}`,
                        });
                    } finally {
                        await session.endSession();
                    }
                }

                /**************************************************************************************
                 * ************************************************************************************
                 *
                 *                            ADD CARD
                 *
                 * ************************************************************************************
                 * ************************************************************************************
                 */

                if (data.metadata.transaction_to == ITransactionTo.ADD_CARD) {
                    try {
                        const creditPayload: any = {
                            amount:
                                data.metadata.normal_amount /
                                Math.abs(data.metadata.exchange_rate_value), // Convert back to dollars
                            user_id: data.metadata.user_id,
                            currency: ICurrency.USD,
                            payment_gateway: IPaymentGateway.PAYSTACK,
                            reference: data.metadata.payment_reference,
                            transaction_hash: data.metadata.transaction_hash,
                            exchange_rate_value:
                                data.metadata.exchange_rate_value,
                            exchange_rate_currency:
                                data.metadata.exchange_rate_currency,
                            ip_address: data.ip_address,
                            description: `Card added`,
                            webhook_id: id,
                            wallet_transaction_type:
                                IWalletTransactionType.FUND_WALLET,
                            data: req.body,
                        };

                        const result = await creditWallet({
                            data: creditPayload,
                            session,
                        });

                        if (!result.success) {
                            await session.abortTransaction();

                            return ResponseHandler.sendErrorResponse({
                                res,
                                code: HTTP_CODES.BAD_REQUEST,
                                error: "Your transactions have been canceled.",
                            });
                        }

                        const add_card = await cardsRepository.create({
                            user_id: data.metadata.user_id,
                            platform: IPaymentGateway.PAYSTACK,
                            card_currency: ICurrency.NGN,
                            authorization_code:
                                data.authorization.authorization_code,
                            last4: data.authorization.last4,
                            exp_month: data.authorization.exp_month,
                            exp_year: data.authorization.exp_year,
                            card_type: data.authorization.card_type,
                            bank: data.authorization.bank,
                        });

                        if (!add_card) {
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
                            message: "Hooray! Transaction successful.",
                        });
                    } catch (error: any) {
                        await session.abortTransaction();

                        return ResponseHandler.sendErrorResponse({
                            res,
                            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                            error: `${error}`,
                        });
                    } finally {
                        await session.endSession();
                    }
                }
                await userRepository.atomicUpdate(user._id, {
                    $set: { paystack_authorization: data.authorization },
                });
            }
        }
    } catch (error: any) {
        console.log("Error", error);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
};
