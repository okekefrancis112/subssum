import { Response } from "express";
import mongoose from "mongoose";
import { ExpressRequest } from "../../server";
import {
    FLUTTERWAVE_SECRET_HASH,
    FLUTTERWAVE_TEST_SECRET_HASH,
    env,
} from "../../config/env.config";
import { flutterwaveApiClient } from "../../integrations/flutterwaveApiClient";
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
    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
    DISCORD_INVESTMENT_ERROR_PRODUCTION,
    DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
    DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
    DISCORD_SUCCESS_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_SUCCESS_WALLET_FUNDING_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import cardsRepository from "../../repositories/cards.repository";
import UtilFunctions, {  } from "../../util";
import walletRepository from "../../repositories/wallet.repository";
import { paymentIsExist } from "../../validations/user/payment.validation";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { RATES } from "../../constants/rates.constant";

export const flutterwaveWebhook = async (
    req: ExpressRequest,
    res: Response
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const secretHash = env.isDev
            ? FLUTTERWAVE_TEST_SECRET_HASH
            : FLUTTERWAVE_SECRET_HASH;
        const signature = req.headers["verif-hash"];

        if (!signature || signature !== secretHash) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "Uh oh! Invalid webhook signature detected.",
            });
        }

        const payload = req.body;

        const { id, meta, ip } = payload.data;

        const getWebhook = await webhookRepository.getOne({ webhook_id: id });

        if (getWebhook) {
            console.log("Webhook already exist");

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: "Oops! Looks like this webhook already exists!",
            });
        }

        //TODO THIS IS WHERE WE CHECK APPLEPAY 👀;

        if (
            payload.event === "charge.completed" &&
            payload.data.payment_type === "applepay"
        ) {
            // ! HANDLE APPLEPAY HERE

            const [flutterwaveApiCall] = await Promise.all([
                await flutterwaveApiClient.verifyTransaction(id),
            ]);

            if (flutterwaveApiCall.status == "success") {
                const { tx_ref } = payload.data;

                const user = await userRepository.getByEmail({
                    email: flutterwaveApiCall.data.customer.email,
                });

                if (!user) {
                    console.log("User does not exist");
                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.NOT_FOUND,
                        error: "Sorry, this user doesn't exist in our records.",
                    });
                }

                const startPos = tx_ref.indexOf("{");
                const metadataJsonString = tx_ref.slice(startPos);

                // Parse the metadata JSON string back to an object
                const meta = JSON.parse(metadataJsonString);

                const txRefExists = await transaction_refRepository.getOne({
                    transaction_hash: meta.transaction_hash,
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
                    transaction_hash: meta.transaction_hash,
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
                    payment_reference: meta.payment_reference,
                });

                if (paymentRefExists) {
                    console.log("APPLE Payment reference exists already");
                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.CONFLICT,
                        error: "Oops! This payment reference already exists.",
                    });
                }

                /**************************************************************************************
                 * ************************************************************************************
                 *
                 *                            WALLET FOR APPLEPAY
                 *
                 * ************************************************************************************
                 * ************************************************************************************
                 */

                if (meta.transaction_to == ITransactionTo.WALLET) {
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

                        // const payload_amount =
                        //   meta.currency === ICurrency.USD
                        //     ? meta.normal_amount
                        //     : meta.normal_amount / meta.exchange_rate_value;

                        const creditPayload: any = {
                            amount: meta.normal_amount,
                            user_id: user._id,
                            currency: meta.currency,
                            payment_gateway:
                                IPaymentGateway.FLUTTERWAVE_APPLEPAY,
                            reference: meta.payment_reference,
                            transaction_hash: meta.transaction_hash,
                            exchange_rate_value: null,
                            exchange_rate_currency: null,
                            ip_address: ip,
                            description: `Wallet Top Up.`,
                            webhook_id: id,
                            data: flutterwaveApiCall,
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

                        const balance =
                            Math.floor(
                                Math.abs(
                                    walletBalance?.balance + meta.normal_amount
                                ) * 100
                            ) / 100;

                        const email_amount =
                            Math.floor(meta.normal_amount * 100) / 100;

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
                    } catch (error: unknown | any) {
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
            }
        }

        /*************************************************************
     *


        //! APPLE PAY ENDS HERE




     *****************************************************************************
     */

        const [flutterwaveApiCall] = await Promise.all([
            await flutterwaveApiClient.verifyTransaction(id),
        ]);

        const user_object: any = await userRepository.getById({
            _id: flutterwaveApiCall.data.meta.user_id,
        });

        if (flutterwaveApiCall.status == "success") {
            const { id, amount, meta, card, ip } = flutterwaveApiCall.data;

            const user = await userRepository.getById({ _id: meta.user_id });

            if (!user) {
                console.log("User does not exist");
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: "Sorry, this user doesn't exist in our records.",
                });
            }

            const txRefExists = await transaction_refRepository.getOne({
                transaction_hash: meta.transaction_hash,
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
                transaction_hash: meta.transaction_hash,
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
                payment_reference: meta.payment_reference,
            });

            if (paymentRefExists) {
                console.log("Payment reference exists already");
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: "Oops! This payment reference already exists.",
                });
            }

            /**************************************************************************************
             * ************************************************************************************
             *
             *                            WALLET
             *
             * ************************************************************************************
             * ************************************************************************************
             */

            if (meta.transaction_to == ITransactionTo.WALLET) {
                try {
                    // Get wallet balance
                    const walletBalance = await walletRepository.getByUserId({
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

                    const payload_amount =
                        meta.currency === ICurrency.USD
                            ? meta.normal_amount
                            : meta.normal_amount / meta.exchange_rate_value;

                    const creditPayload: any = {
                        amount: payload_amount,
                        user_id: meta.user_id,
                        currency: ICurrency.USD,
                        wallet_transaction_type:
                            IWalletTransactionType.FUND_WALLET,
                        payment_gateway: IPaymentGateway.FLUTTERWAVE,
                        reference: meta.payment_reference,
                        transaction_hash: meta.transaction_hash,
                        exchange_rate_value: null,
                        exchange_rate_currency: null,
                        ip_address: ip,
                        description: `Wallet Top Up.`,
                        webhook_id: id,
                        data: flutterwaveApiCall,
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

                    const balance =
                        Math.floor(
                            Math.abs(walletBalance?.balance + payload_amount) *
                                100
                        ) / 100;

                    const email_amount = Math.floor(payload_amount * 100) / 100;

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
             *                            ADD CARD
             *
             * ************************************************************************************
             * ************************************************************************************
             */

            if (meta.transaction_to == ITransactionTo.ADD_CARD) {
                try {
                    const creditPayload: any = {
                        amount: parseFloat(meta.dollar_amount),
                        user_id: meta.user_id,
                        currency: ICurrency.USD,
                        payment_gateway: IPaymentGateway.FLUTTERWAVE,
                        reference: meta.payment_reference,
                        transaction_hash: meta.transaction_hash,
                        exchange_rate_value: meta.exchange_rate_value,
                        exchange_rate_currency: meta.exchange_rate_currency,
                        wallet_transaction_type:
                            IWalletTransactionType.FUND_WALLET,
                        ip_address: ip,
                        description: `Card added.`,
                        webhook_id: id,
                        data: flutterwaveApiCall,
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
                        user_id: meta.user_id,
                        platform: IPaymentGateway.FLUTTERWAVE,
                        card_currency:
                            meta.currency == ICurrency.NGN
                                ? ICurrency.NGN
                                : ICurrency.USD,
                        authorization_code: card.token,
                        last4: card.last_4digits,
                        first6: card.first_6digits,
                        exp_month: card.expiry.split("/")[0],
                        exp_year: card.expiry.split("/")[1],
                        card_type: card.type,
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
                } catch (error: unknown | any) {
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

            const {
                investment_category,
                payment_gateway,
                user_id,
                listing_id,
                payment_name,
                normal_amount,
                intervals,
                payment_occurrence,
                duration,
                transaction_hash,
                payment_reference,
            } = meta;

            if (meta.transaction_to === ITransactionTo.INVESTMENT) {
                try {
                    const paymentPlayload = {
                        investment_category: investment_category,
                        payment_gateway: payment_gateway,
                        user_id: user_id,
                        listing_id: listing_id,
                        transaction_medium: ITransactionMedium.CARD,
                        entity_reference: IEntityReference.INVESTMENTS,
                        payment_name: payment_name,
                        amount: normal_amount,
                        intervals: intervals,
                        total_amount: amount,
                        payment_occurrence: payment_occurrence,
                        duration: duration,
                        transaction_hash: transaction_hash,
                        payment_reference: payment_reference,
                        exchange_rate_value: 0,
                        exchange_rate_currency: "",
                        meta_data: flutterwaveApiCall,
                        webhook_id: id,
                        session,
                    };

                    // Create payment
                    const result = await createInvestpayment(paymentPlayload);

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

            if (meta.transaction_to === ITransactionTo.INVESTMENT_TOPUP) {
                try {
                    const topUpPayload = {
                        user_id: meta.user_id,
                        payment: meta.payment,
                        amount: meta.normal_amount,
                        listing_id: meta.listing_id,
                        transaction_medium: ITransactionMedium.CARD,
                        entity_reference: IEntityReference.INVESTMENTS,
                        payment_gateway: meta.payment_gateway,
                        transaction_hash: meta.transaction_hash,
                        payment_reference: meta.payment_reference,
                        investment_form: meta.investment_form,
                        exchange_rate_value: 0,
                        exchange_rate_currency: "",
                        meta_data: flutterwaveApiCall,
                        webhook: id,
                        session,
                    };

                    // Top Up Investment
                    const result = await topUpInvestpayment(topUpPayload);

                    if (!result.success) {
                        await session.abortTransaction();

                        return ResponseHandler.sendErrorResponse({
                            res,
                            code: HTTP_CODES.BAD_REQUEST,
                            error: "Your transactions have been canceled.",
                        });
                    }

                    const rate = RATES.INVESTMENT_TOKEN_VALUE;
                    const tokens = amount / rate;

                    // await listingRepository.atomicUpdate(
                    //     { _id: meta.listing_id },
                    //     {
                    //         $inc: {
                    //             available_tokens: -Number(tokens),
                    //             total_investments_made: 1,
                    //             total_investment_amount: Number(amount),
                    //             total_tokens_bought: Number(tokens),
                    //         },
                    //         $addToSet: { investors: user._id },
                    //     },
                    //     session
                    // );

                    await userRepository.atomicUpdate(
                        user._id,
                        { $inc: { total_amount_invested: Number(amount) } },
                        session
                    );

                    const getpayment = await paymentIsExist(
                        req,
                        meta.payment,
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

                    const payload_amount =
                        meta.currency == ICurrency.USD
                            ? amount
                            : meta.normal_amount / meta.exchange_rate_value;

                    await session.commitTransaction();
                    await session.endSession();

                    return ResponseHandler.sendSuccessResponse({
                        res,
                        code: HTTP_CODES.OK,
                        message: "Hooray! Transaction successful.",
                    });
                } catch (error: unknown | any) {
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
        } else if (flutterwaveApiCall.status == "error") {
            const failurePayload: any = {
                amount: meta.normal_amount, // Convert back to dollars
                user_id: meta.user_id,
                currency: ICurrency.USD,
                payment_gateway: IPaymentGateway.FLUTTERWAVE,
                reference: meta.payment_reference,
                transaction_hash: meta.transaction_hash,
                ip_address: ip,
                description: `Transaction successful.`,
                transaction_status: ITransactionStatus.FAILED,
                webhook_id: id,
                data: flutterwaveApiCall,
            };

            await transactionRepository.create(failurePayload);

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "Sorry, payment verification failed. The transaction could not be processed.",
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
};
