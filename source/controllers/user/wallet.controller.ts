import { Response } from "express";
import mongoose, { Types } from "mongoose";
import {
    APP_CONSTANTS,
    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
    DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
    DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
    HTTP_CODES,
    WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT,
    WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION,
} from "../../constants/app_defaults.constant";
import { RATES } from "../../constants/rates.constant";
import { paystackApiClient } from "../../integrations/paystackApiClient";
import { flutterwaveApiClient } from "../../integrations/flutterwaveApiClient";
import { monoApiClient } from "../../integrations/monoApiClient";
import walletRepository from "../../repositories/wallet.repository";
import { Wallet } from "../../models/";
import {
    IChargeType,
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../../interfaces/transaction.interface";
import userRepository from "../../repositories/user.repository";
import { ExpressRequest } from "../../server";
import UtilFunctions, {
    checkIfEmpty,
    check_card_expiry,
    formatDecimal,
    link,
    switchDate,
    throwIfUndefined,
} from "../../util";
import ResponseHandler from "../../util/response-handler";
import { creditWallet, debitWallet } from "../../helpers/wallet.helper";
import { WALLET_STATUS } from "../../interfaces/wallet.interface";
import transactionRepository from "../../repositories/transaction.repository";
import { INotificationCategory } from "../../interfaces/notification.interface";
import cardsRepository from "../../repositories/cards.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import auditRepository from "../../repositories/audit.repository";
import {
    DiscordTaskJob,
    NotificationTaskJob,
} from "../../services/queues/producer.service";
import otpRepository from "../../repositories/otp.repository";
import banksRepository from "../../repositories/banks.repository";
import exchangeRateRepository from "../../repositories/exchange-rate.repository";
import {
    diaspora_usd_charge,
    flutterwave_usd_charge,
    paystack_charge,
} from "../../helpers/charges.helper";
import { env } from "../../config";
import { discordMessageHelper } from "../../helpers/discord.helper";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { anchorApiClient } from "../../integrations/anchorApiClient";
import { ChargeRecurring } from "../../helpers/recurring.helper";

export async function fundWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const userObject = throwIfUndefined(req.user, "req.user");

        const _id = new Types.ObjectId(userObject._id);

        const { default_choice, is_dollar, payment_gateway, channel } =
            req.body;

        const amount = Math.trunc(parseFloat(req.body.amount) * 10) / 10;

        if (Math.sign(amount) === -1) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Please input a positive amount",
            });
        }

        const user: any = await userRepository.getById({ _id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found. Please check your input.",
            });
        }

        const wallet = await walletRepository.getByUserId({ user_id: _id });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Sorry, this wallet does not exist.",
            });
        }

        if (wallet.status === WALLET_STATUS.INACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Wallet is inactive",
            });
        }

        let flutterwave_channel;
        let paystack_channel;

        if (channel === "bank") {
            flutterwave_channel = "banktransfer";
            paystack_channel = "bank_transfer";
        } else if (channel === "card") {
            flutterwave_channel = "card";
            paystack_channel = "card";
        }

        const rate = await exchangeRateRepository.getOne({ is_default: true });
        const buy_rate: number =
            Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
        const dollarAmount: number = amount / buy_rate;

        // ! Check if user has completed KYC

        let check_amount: number = 0;

        if (
            payment_gateway == IPaymentGateway.PAYSTACK ||
            (payment_gateway == IPaymentGateway.FLUTTERWAVE &&
                is_dollar == "false") ||
            payment_gateway == IPaymentGateway.MONO
        ) {
            check_amount = Number(user.total_amount_funded) + amount / buy_rate;
        } else if (
            payment_gateway == IPaymentGateway.FLUTTERWAVE &&
            is_dollar == "true"
        ) {
            check_amount = Number(user.total_amount_funded) + amount;
        }

        if (
            !user.kyc_completed &&
            Number(
                check_amount >
                    APP_CONSTANTS.LIMITS.MAXIMUM_WALLET_CREDIT_INCOMPLETE_KYC
            )
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Limit of $${APP_CONSTANTS.LIMITS.MAXIMUM_WALLET_CREDIT_INCOMPLETE_KYC} exceeded due to incomplete KYC process.`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        /************************************
         * **********************************
         * **********************************
         *
         * ************ PAYSTACK ************
         * **********************************
         * **********************************
         */

        if (payment_gateway == IPaymentGateway.PAYSTACK) {
            const get_card = await cardsRepository.getOne({
                user_id: user._id,
                is_default: true,
                platform: IPaymentGateway.PAYSTACK,
            });

            if (default_choice === "yes" && !get_card) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "You have no saved Paystack card.",
                });
            }

            const is_card_valid = await check_card_expiry(
                get_card?.exp_month,
                get_card?.exp_year
            );

            if (default_choice === "yes" && !is_card_valid) {
                await discordMessageHelper(
                    req,
                    user,
                    `Your saved card has expired ❌`,
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "PAYSTACK WALLET FUNDING"
                );
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }
            const fee = paystack_charge(amount);
            const paystackAmount = (amount + fee) * 100;

            const payload = {
                email: user?.email!,
                amount: Number(paystackAmount),
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.WALLET
                }?success=${true}`,
                channels: [paystack_channel],
                metadata: {
                    normal_amount: amount,
                    transaction_to: ITransactionTo.WALLET,
                    user_id: _id,
                    dollar_amount: dollarAmount,
                    exchange_rate_value: buy_rate,
                    exchange_rate_currency: rate?.currency,
                    currency: ICurrency.USD,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.PAYSTACK,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                },
                customerName: `${user?.first_name} ${user?.last_name}`,
            };

            const [apiCall] = await Promise.all([
                get_card?.authorization_code && default_choice === "yes"
                    ? await paystackApiClient.recurringCharge({
                          customerName: `${user?.first_name} ${user?.last_name}`,
                          email: user?.email!,
                          amount: Number(paystackAmount),
                          metadata: {
                              normal_amount: amount,
                              transaction_to: ITransactionTo.WALLET,
                              user_id: _id,
                              dollar_amount: dollarAmount,
                              exchange_rate_value: buy_rate,
                              exchange_rate_currency: rate?.currency,
                              currency: ICurrency.USD,
                              payment_reference: reference,
                              transaction_hash,
                              payment_gateway: IPaymentGateway.PAYSTACK,
                              chargeType: IChargeType.ONE_TIME_PAYMENT,
                          },
                          authorization_code: get_card?.authorization_code,
                      })
                    : await paystackApiClient.initializeTransaction(payload),
            ]);

            const data = {
                url: apiCall.data.authorization_url,
                access_code: apiCall.data.access_code,
                reference: apiCall.data.reference,
            };

            await discordMessageHelper(
                req,
                user,
                `Paystack payment initiated successfully ✅`,
                DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
                DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
                "PAYSTACK WALLET FUNDING",
                { Amount: amount, transaction_hash }
            );

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Paystack payment link generated successfully.",
                data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ********** FLUTTERWAVE USD ***********
         *
         * **********************************
         * **********************************
         */

        if (
            payment_gateway == IPaymentGateway.FLUTTERWAVE &&
            String(is_dollar) == "true"
        ) {
            // Get Flutterwave User Card
            const get_card = await cardsRepository.getOne({
                user_id: user._id,
                platform: IPaymentGateway.FLUTTERWAVE,
                card_currency: ICurrency.USD,
                is_default: true,
            });

            if (
                String(is_dollar) == "true" &&
                default_choice === "yes" &&
                !get_card
            ) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "You have no saved flutterwave USD card",
                });
            }

            const is_card_valid = await check_card_expiry(
                get_card?.exp_month,
                get_card?.exp_year
            );

            if (default_choice === "yes" && !is_card_valid) {
                await discordMessageHelper(
                    req,
                    user,
                    `Your saved card has expired ❌`,
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "FLUTTERWAVE USD WALLET FUNDING"
                );
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            if (amount > 1000 || amount < 1) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Please input an amount between $1 to $1000.",
                });
            }

            const fee = flutterwave_usd_charge(amount);
            const flutterwave_usd_amount = amount + fee;

            const payload = {
                tx_ref: reference,
                email: user?.email!,
                amount: Number(flutterwave_usd_amount),
                currency: ICurrency.USD,
                redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                meta: {
                    normal_amount: amount,
                    transaction_to: ITransactionTo.WALLET,
                    user_id: _id,
                    dollar_amount: amount,
                    currency: ICurrency.USD,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.FLUTTERWAVE,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                },
                customer: {
                    transaction_to: ITransactionTo.WALLET,
                    user_id: _id,
                    email: user.email,
                },
                customizations: {
                    title: "Keble Wallet Funding",
                    logo: "https://staging.keble.co/svgs/keble-logo-black.svg",
                },
            };

            const [flutterwaveApiCall] = await Promise.all([
                get_card && default_choice === "yes"
                    ? await flutterwaveApiClient.recurringCharge({
                          token: String(get_card?.authorization_code),
                          tx_ref: reference,
                          email: user?.email!,
                          amount: Number(flutterwave_usd_amount),
                          currency: ICurrency.USD,
                          redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                          meta: {
                              normal_amount: amount,
                              transaction_to: ITransactionTo.WALLET,
                              user_id: _id,
                              dollar_amount: amount,
                              currency: ICurrency.USD,
                              payment_reference: reference,
                              transaction_hash,
                              payment_gateway: IPaymentGateway.FLUTTERWAVE,
                              chargeType: IChargeType.ONE_TIME_PAYMENT,
                          },
                      })
                    : await flutterwaveApiClient.initializeTransaction(payload),
            ]);

            const data = {
                url: flutterwaveApiCall.data.link,
                reference: reference,
            };

            await discordMessageHelper(
                req,
                user,
                `Flutterwave payment initiated successfully ✅`,
                DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
                DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
                "FLUTTERWAVE WALLET FUNDING",
                { Amount: amount, transaction_hash }
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Flutterwave payment url generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment link generated successfully.",
                data: data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ***** FLUTTERWAVE APPLEPAY *******
         *
         * **********************************
         * **********************************
         */

        const meta = {
            normal_amount: amount,
            transaction_to: ITransactionTo.WALLET,
            currency: ICurrency.USD,
            payment_reference: reference,
            transaction_hash,
        };

        const jsonString = JSON.stringify({ meta: meta });

        const apple_pay_reference = `${reference} ${jsonString}`;

        if (
            payment_gateway == IPaymentGateway.FLUTTERWAVE &&
            String(is_dollar) == "apple"
        ) {
            const payload = {
                tx_ref: apple_pay_reference,
                email: user?.email!,
                amount: amount,
                currency: ICurrency.USD,
                redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                fullname: `${user?.first_name} ${user?.last_name}`,
            };

            const apple_pay_link = await flutterwaveApiClient.applePay(payload);

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Apple_pay payment link generated successfully.",
                data: apple_pay_link,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ********** FLUTTERWAVE NGN *******
         * **********************************
         * **********************************
         */

        if (
            payment_gateway == IPaymentGateway.FLUTTERWAVE &&
            String(is_dollar) == "false"
        ) {
            // Get Paystack User Card
            const get_card = await cardsRepository.getOne({
                user_id: user._id,
                platform: IPaymentGateway.FLUTTERWAVE,
                card_currency: ICurrency.NGN,
            });

            if (is_dollar == "false" && default_choice === "yes" && !get_card) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "You have no saved flutterwave NGN card",
                });
            }

            const is_card_valid = await check_card_expiry(
                get_card?.exp_month,
                get_card?.exp_year
            );

            if (default_choice === "yes" && !is_card_valid) {
                await discordMessageHelper(
                    req,
                    user,
                    `Your saved card has expired ❌`,
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "FLUTTERWAVE NGN WALLET FUNDING"
                );
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            const fee = paystack_charge(amount);
            const flutterwave_ngn_amount = amount + fee;

            const payload = {
                tx_ref: reference,
                email: user?.email!,
                amount: Number(flutterwave_ngn_amount),
                currency: ICurrency.NGN,
                payment_options: flutterwave_channel,
                redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                meta: {
                    normal_amount: amount,
                    channels: flutterwave_channel,
                    transaction_to: ITransactionTo.WALLET,
                    user_id: user._id,
                    dollar_amount: dollarAmount,
                    currency: ICurrency.NGN,
                    payment_reference: reference,
                    exchange_rate_value: buy_rate,
                    exchange_rate_currency: rate?.currency,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.FLUTTERWAVE,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                },
                customer: {
                    email: user?.email!,
                    transaction_to: ITransactionTo.WALLET,
                    user_id: user._id,
                },
                customizations: {
                    title: "Keble Wallet Top up",
                    logo: "https://staging.keble.co/svgs/keble-logo-black.svg",
                },
            };

            const [flutterwaveApiCall] = await Promise.all([
                get_card && default_choice === "yes"
                    ? await flutterwaveApiClient.recurringCharge({
                          token: String(get_card?.authorization_code),
                          tx_ref: reference,
                          email: user?.email!,
                          amount: Number(flutterwave_ngn_amount),
                          currency: ICurrency.NGN,
                          redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                          meta: {
                              normal_amount: amount,
                              channels: channel,
                              transaction_to: ITransactionTo.WALLET,
                              user_id: user._id,
                              dollar_amount: amount,
                              currency: ICurrency.NGN,
                              payment_reference: reference,
                              exchange_rate_value: buy_rate,
                              exchange_rate_currency: rate?.currency,
                              transaction_hash,
                              payment_gateway: IPaymentGateway.FLUTTERWAVE,
                              chargeType: IChargeType.ONE_TIME_PAYMENT,
                          },
                      })
                    : await flutterwaveApiClient.initializeTransaction(payload),
            ]);

            const data = {
                url: flutterwaveApiCall.data.link,
                reference: reference,
            };

            await discordMessageHelper(
                req,
                user,
                `Flutterwave ngn payment initiated successfully ✅`,
                DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
                DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
                "FLUTTERWAVE NGN WALLET FUNDING",
                { Amount: amount, transaction_hash }
            );

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment url generated successfully",
                data: data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ************* MONO ***************
         * **********************************
         * **********************************
         */

        if (payment_gateway == IPaymentGateway.MONO) {
            if (!user.account_id) {
                await discordMessageHelper(
                    req,
                    user,
                    `Kindly link your account to proceed ❌`,
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "MONO WALLET FUNDING"
                );
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Kindly link your account to proceed.",
                });
            }

            const fee = paystack_charge(amount);
            const monoAmount = (amount + fee) * 100;

            const payload = {
                amount: String(monoAmount),
                type: "onetime-debit",
                description: "Keble Wallet Funding",
                reference: reference,
                account: user.account_id,
                redirect_url: APP_CONSTANTS.REDIRECTS.WALLET,
                meta: {
                    normal_amount: amount,
                    reference: reference,
                    transaction_to: ITransactionTo.WALLET,
                    user_id: _id,
                    dollar_amount: dollarAmount,
                    exchange_rate_value: buy_rate,
                    exchange_rate_currency: rate?.currency,
                    currency: ICurrency.USD,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.MONO,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                },
            };

            const [monoApi] = await Promise.all([
                await monoApiClient.initializeTransaction(payload),
            ]);

            const data = {
                url: monoApi.payment_link,
                reference: monoApi.reference,
            };

            await discordMessageHelper(
                req,
                user,
                `Mono payment initiated successfully ✅`,
                DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
                DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
                "MONO WALLET FUNDING",
                { Amount: amount, transaction_hash }
            );

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Mono payment link generated successfully.",
                data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ************* DIASPORA ***************
         * **********************************
         * **********************************
         */

        if (payment_gateway == IPaymentGateway.DIASPORA_TRANSFER) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const user = throwIfUndefined(req.user, "req.user");

                const reference = UtilFunctions.generateTXRef();
                const transaction_hash = UtilFunctions.generateTXHash();

                const fee = diaspora_usd_charge(amount);
                const diasporaAmount = (amount + fee) * 100;

                try {
                    const creditPayload: any = {
                        amount: diasporaAmount,
                        // note: note,
                        user_id: user._id,
                        currency: ICurrency.USD,
                        payment_gateway: IPaymentGateway.DIASPORA_TRANSFER,
                        reference: reference,
                        transaction_hash: transaction_hash,
                        description: `Wallet Top Up.`,
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

                    // This checks the balance of the user's wallet
                    const balance =
                        Math.floor(Math.abs(wallet?.balance + amount) * 100) /
                        100;

                    // send a top up email to the user
                    // await UtilFunctions.sendEmail2("fund-wallet.hbs", {
                    //     to: user.email,
                    //     subject: "Keble Wallet Top Up",
                    //     props: {
                    //         email: user.email,
                    //         name: user.first_name,
                    //         balance: balance,
                    //         amount: amount,
                    //         createdAt: new Date().toLocaleString(),
                    //     },
                    // });

                    await session.commitTransaction();
                    await session.endSession();

                    await discordMessageHelper(
                        req,
                        user,
                        `Diaspora Bank Transfer initiated successfully ✅`,
                        DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT,
                        DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION,
                        "Diapora Bank Transfer WALLET FUNDING",
                        { Amount: amount, transaction_hash }
                    );

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
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function saveBeneficiary(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const { recipient_account_number } = req.body;

        const getWallet = await walletRepository.getByUserId({
            user_id: user?._id,
        });
        const getRecipientWallet = await walletRepository.getByAccountNumber({
            wallet_account_number: recipient_account_number,
        });

        if (!getRecipientWallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no user was found with this wallet ID: ${recipient_account_number}.`,
            });
        }

        const _id = new Types.ObjectId(getWallet?._id);

        await walletRepository.atomicUpdate(_id, {
            $addToSet: {
                beneficiaries: new mongoose.Types.ObjectId(
                    getRecipientWallet?._id
                ),
            },
        });

        return res.status(201).json({
            status: true,
            code: HTTP_CODES.CREATED,
            message: "Success! Your beneficiary has been saved.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function deleteBeneficiary(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const { account_number } = req.params;

        const getWallet = await walletRepository.getByUserId({
            user_id: user?._id,
        });
        const getRecipientWallet = await walletRepository.getByAccountNumber({
            wallet_account_number: account_number,
        });

        if (!getRecipientWallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no user was found with this wallet ID: ${account_number}.`,
            });
        }

        const _id = new Types.ObjectId(getWallet?._id);

        const check_beneficiary = getWallet?.beneficiaries?.includes(
            getRecipientWallet?._id
        );

        if (!check_beneficiary) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no beneficiary was found with this wallet ID: ${account_number}.`,
            });
        }

        const delete_beneficiary = await walletRepository.atomicUpdate(_id, {
            $pull: {
                beneficiaries: new mongoose.Types.ObjectId(
                    getRecipientWallet?._id
                ),
            },
        });

        if (delete_beneficiary) {
            return res.status(201).json({
                status: true,
                code: HTTP_CODES.CREATED,
                message: "You have successfully deleted the beneficiary.",
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

export async function getBeneficiaries(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const userObject = throwIfUndefined(req.user, "req.user");
    try {
        const wallet = await Wallet.findOne({ user_id: userObject._id })
            .select("-_id beneficiaries")
            .populate({
                path: "beneficiaries",
                select: "-_id user_id wallet_account_number currency",
                populate: {
                    path: "user_id",
                    select: "-_id first_name last_name profile_photo",
                },
            });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Beneficiaries fetched.",
            data: wallet,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function walletTransfer(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const senderUser = await userRepository.getById({ _id: user._id });

        if (!senderUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, the sender's identity could not be verified.`,
            });
        }

        // ! This part handles the transfer restrictions for users without complete KYC
        if (!senderUser.kyc_completed) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { recipient_account_number, amount, note } = req.body;

        // Get Sender Wallet
        const sender_wallet = await walletRepository.getByUserId({
            user_id: senderUser._id,
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
                error: "Invalid amount. Amount must be greater than zero.",
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

        // Get Recipients Wallet
        const wallet = await walletRepository.getByAccountNumber({
            wallet_account_number: recipient_account_number,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no user was found with account number: ${recipient_account_number}.`,
            });
        }

        if (wallet.status !== WALLET_STATUS.ACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: `Sorry, transaction could not be completed due to recipient's blocked wallet.`,
            });
        }

        if (sender_wallet.wallet_account_number === recipient_account_number) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, you cannot transfer to the same wallet.`,
            });
        }

        const token: any = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            token_type: APP_CONSTANTS.TOKEN_TYPE.TRANSFER,
            recipient_account_number,
            amount,
            note,
        });

        // Save OTP
        const otp = await UtilFunctions.generateOtp({
            user_id: user._id,
            token,
        });

        await UtilFunctions.sendEmail2("wallet-transfer-otp.hbs", {
            to: user?.email,
            subject: "Wallet Transfer OTP",
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
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function verifyWalletTransfer(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = throwIfUndefined(req.user, "req.user");

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
            APP_CONSTANTS.TOKEN_TYPE.TRANSFER
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `This OTP is not for wallet transfer, its for ${verify_token.decoded.token_type}, please use the correct OTP`,
            });
        }

        const { recipient_account_number, amount, note } = verify_token.decoded;

        // Get Recipients Wallet
        const wallet = await walletRepository.getByAccountNumber({
            wallet_account_number: recipient_account_number,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no user was found with this account number: ${recipient_account_number}`,
            });
        }

        if (wallet.status !== WALLET_STATUS.ACTIVE) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: `Transaction failed. Recipient's wallet is blocked.`,
            });
        }

        const senderUser = await userRepository.getById({ _id: user._id });

        if (!senderUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender could not be verified`,
            });
        }

        // Get Sender Wallet

        const sender_wallet = await walletRepository.getByUserId({
            user_id: senderUser._id,
        });

        if (!sender_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sender's wallet not found`,
            });
        }

        if (sender_wallet.wallet_account_number == recipient_account_number) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, cannot transfer to same wallet.`,
            });
        }

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        // get reciever
        const receiver_wallet = await walletRepository.wallet_account_number({
            wallet_account_number: recipient_account_number,
        });

        if (!receiver_wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Receiver's wallet not found`,
            });
        }

        const receiver_id = new Types.ObjectId(receiver_wallet?.user_id);
        const receiverUser = await userRepository.getById({
            _id: new Types.ObjectId(receiver_id),
        });

        if (!receiverUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Receiver could not be verified`,
            });
        }

        const debitPayload = {
            amount: amount,
            user_id: new Types.ObjectId(sender_wallet?.user_id),
            sender: new Types.ObjectId(sender_wallet?.user_id),
            recipient: wallet?.user_id,
            currency: ICurrency.USD,
            note: note,
            payment_gateway: IPaymentGateway.WALLET,
            reference,
            transaction_hash,
            transaction_to: ITransactionTo.WALLET,
            transaction_type: ITransactionType.DEBIT,
            wallet_transaction_type: IWalletTransactionType.SEND_TO_FRIEND,
            description: `Transfer to ${receiverUser.first_name} ${receiverUser.last_name}`,
        };

        const creditPayload = {
            amount: amount,
            user_id: new Types.ObjectId(wallet?.user_id),
            sender: sender_wallet?.user_id,
            recipient: wallet?.user_id,
            currency: ICurrency.USD,
            payment_gateway: IPaymentGateway.WALLET,
            note: note,
            reference,
            transaction_hash,
            transaction_to: ITransactionTo.WALLET,
            wallet_transaction_type: IWalletTransactionType.RECEIVE_FROM_FRIEND,
            description: `Transfer from ${senderUser.first_name} ${senderUser.last_name}`,
        };

        const result = await Promise.all([
            debitWallet({ data: debitPayload, session }),
            creditWallet({ data: creditPayload, session }),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        if (failedTxns.length) {
            const errors = failedTxns.map((a) => a.message);
            await session.abortTransaction();
            session.endSession();

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: errors,
            });
        }

        // Wallet Discord Notification
        const discordMessage = `
    First Name:- ${user?.first_name!},
    Last Name:- ${user?.last_name!},
    Email:- ${user?.email!},
    path:- ${req.originalUrl},
  `;

        await DiscordTaskJob({
            name: `Wallet transfer successful`,
            data: {
                title: `$${amount} transferred, sent to ${receiverUser.first_name} ${receiverUser.last_name} | ${process.env.NODE_ENV} environment `,
                message: discordMessage,
                channel_link: env.isDev
                    ? WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT
                    : WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION,
            },
        });

        await session.commitTransaction();
        session.endSession();

        await otpRepository.destroyOtpToken({ user_id: user._id });

        //  create a notification for the sender
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: new Types.ObjectId(sender_wallet?.user_id),
                title: "Wallet Transfer",
                content: `$${amount} transferred, sent to ${receiverUser.first_name} ${receiverUser.last_name}`,
                notification_category: INotificationCategory.WALLET,
                action_link: `${link()}/wallet`,
            },
        });

        // Notification for receiver
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: new Types.ObjectId(wallet?.user_id),
                title: "Investment Notification",
                notification_category: INotificationCategory.WALLET,
                content: `$${amount} received, sent from ${senderUser.first_name} ${senderUser.last_name}`,
                action_link: `${link()}/wallet`,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Wallet Transfer successful",
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

export async function getWalletName(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { account_number } = req.body;

        const wallet = await walletRepository.getByAccountNumber({
            wallet_account_number: account_number,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, no user was found with this account number: ${account_number}`,
            });
        }

        const _id = new Types.ObjectId(wallet.user_id);

        const user = await userRepository.getById({ _id });

        const details = {
            name: `${user?.first_name} ${user?.last_name}`,
            image: user?.profile_photo ? user?.profile_photo : "",
            account_number: wallet.wallet_account_number,
        };

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Account details fetched",
            data: details,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function getUserWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const wallet = await walletRepository.getByUserId({
            user_id: user._id,
        });

        if (!wallet) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Wallet does not exist`,
            });
        }

        const _id = new Types.ObjectId(user._id);

        const getUser = await userRepository.getByQuery(
            { _id: _id },
            "_id first_name last_name"
        );

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Wallet user does not exist",
            });
        }

        const bank = getUser
            ? await banksRepository.getOne({ user_id: getUser._id })
            : null;

        const name = `${getUser?.first_name} ${getUser?.last_name}`;

        const balance = Math.floor(wallet.balance * 100) / 100;
        const wallet_id = wallet.wallet_account_number;

        const transactions =
            await transactionRepository.findPaginatedWalletTransactions(
                req,
                getUser._id
            );

        const saved_transactions = await transactionRepository.find({
            payment_gateway: IPaymentGateway.WALLET,
            transaction_type: ITransactionType.CREDIT,
            transaction_to: ITransactionTo.SAVINGS,
            wallet_transaction_type: IWalletTransactionType.INTEREST_RECEIVED,
            user_id: getUser._id,
        });

        const withdrawal_transactions = await transactionRepository.find({
            transaction_type: ITransactionType.WITHDRAWAL,
            keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
            wallet_transaction_type: IWalletTransactionType.WITHDRAWAL,
            user_id: getUser._id,
        });

        const interest = saved_transactions.reduce(
            (acc: number, e: any) => acc + e.amount,
            0
        );

        const withdrawals = withdrawal_transactions.reduce(
            (acc: number, e: any) => acc + e.amount,
            0
        );

        const withdrawals_count = withdrawal_transactions.length;

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "User wallet details fetched",
            data: {
                transactions,
                user_info: {
                    name: name,
                    image: getUser?.profile_photo ? getUser?.profile_photo : "",
                    bank: {
                        bank_name: bank?.bank_name,
                        account_number: bank?.account_number,
                        account_name: bank?.account_name,
                    },
                },
                balance: balance,
                wallet_id,
                total_interest: interest,
                withdrawals: `${formatDecimal(
                    withdrawals,
                    100
                )}/${withdrawals_count}`,
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

export async function generateNGNWallet(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");

    const getUser = await userRepository.getById({ _id: user._id });

    if (!getUser) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "User not found",
        });
    }

    if (!getUser.kyc_completed) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error: "Please complete your KYC to proceed.",
        });
    }

    if (getUser.id_verification !== "bvn" && checkIfEmpty(getUser.bvn)) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.BAD_REQUEST,
            error: "Please add and verify your BVN to proceed.",
        });
    }

    const checkFields = (fieldValue: string | undefined, fieldName: string) => {
        if (checkIfEmpty(fieldValue)) {
            ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please add your ${fieldName} to proceed.`,
            });
            return true;
        }
        return false;
    };

    if (
        checkFields(getUser?.first_name, "first name") ||
        checkFields(getUser?.last_name, "last name") ||
        checkFields(getUser?.email, "email") ||
        checkFields(getUser?.phone_number, "phone number") ||
        checkFields(getUser?.dob, "date of birth") ||
        checkFields(getUser?.address, "address") ||
        checkFields(getUser.gender, "gender") ||
        checkFields(getUser.city, "city") ||
        checkFields(getUser.postal_code, "postal code") ||
        checkFields(getUser.state, "state") ||
        checkFields(getUser.country_code, "country")
    ) {
        return;
    }

    const onboardAnchorCustomer = await anchorApiClient.create_customer({
        email: getUser.email!,
        firstName: getUser.first_name!,
        lastName: getUser.last_name!,
        middleName: getUser.middle_name!,
        phoneNumber: getUser.phone_number!,
        dateOfBirth: switchDate(getUser.dob!),
        addressLine_1: getUser.address!,
        bvn: getUser.id_number! || getUser.bvn!,
        gender: getUser.gender!,
        city: getUser.city!,
        postalCode: getUser.postal_code!,
        state: getUser.state!,
        country: getUser.country_code!,
    });

    await userRepository.atomicUpdate(user._id, {
        $set: {
            anchor_customer_id: onboardAnchorCustomer.data.id,
        },
    });

    return res.json(test);
}

export async function deleteCustomer(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const customer_id = req.params.customer_id;
    const delete_customer = anchorApiClient.delete_customer({
        customer_id,
    });

    res.json(delete_customer);
}

export async function testGen(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");

    const getUser = await userRepository.getById({ _id: user._id });

    if (!getUser) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.NOT_FOUND,
            error: "User not found",
        });
    }

    const test_gen = await anchorApiClient.generate_account({
        firstName: getUser.first_name!,
        lastName: getUser.last_name!,
        reference: getUser._id,
        email: getUser.email!,
        bvn: getUser.bvn!,
    });

    res.json(test_gen);
}

export async function testGen2(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // await ProcessPayouts(req);
    await ChargeRecurring(req);
    res.json("done");
}
