import { Response } from "express";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import { paystackApiClient } from "../../integrations/paystackApiClient";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import { DiscordTaskJob } from "../../services/queues/producer.service";
import {
    APP_CONSTANTS,
    BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT,
    BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import userRepository from "../../repositories/user.repository";
import UtilFunctions, {
    serverErrorNotification,
    throwIfUndefined,
} from "../../util";
import {
    IChargeType,
    IPaymentGateway,
    ITransactionTo,
} from "../../interfaces/transaction.interface";
import { RATES } from "../../constants/rates.constant";
import cardsRepository from "../../repositories/cards.repository";
import { flutterwaveApiClient } from "../../integrations/flutterwaveApiClient";
import exchangeRateRepository from "../../repositories/exchange-rate.repository";
import {
    flutterwave_usd_charge,
    paystack_charge,
} from "../../helpers/charges.helper";
import { env } from "../../config";
import { ICurrency } from "../../interfaces/exchange-rate.interface";

/****
 *
 *
 * Add Card
 */

export async function addCard(
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

        const get_cards = await cardsRepository.getAll({ user_id: user._id });

        if (get_cards.length >= RATES.NO_OF_CARDS_ALLOWED) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Card limit reached, you can only add 3 cards, please delete one to add a new one",
            });
        }

        const {
            platform,
            card_currency,
        }: { platform: string; card_currency: string } = req.body;

        const reference = UtilFunctions.generateTXRef();
        const transaction_hash = UtilFunctions.generateTXHash();

        /***********************
         *
         *
         * ADD PAYSTACK NGN CARD
         */

        if (platform === IPaymentGateway.PAYSTACK) {
            const rate = await exchangeRateRepository.getOne({ is_default: true });
            const buy_rate =
                Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;

            // const fee = paystack_charge(RATES.ADD_CARD_AMOUNT);
            const fee = 2;
            const paystackAmount = (RATES.ADD_CARD_AMOUNT + fee) * 100;
            const dollarAmount = RATES.ADD_CARD_AMOUNT / buy_rate;
            const payload = {
                email: check_user?.email!,
                amount: paystackAmount,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.ACCOUNT
                }?success=${true}`,
                channels: ["card"],
                metadata: {
                    normal_amount: RATES.ADD_CARD_AMOUNT,
                    transaction_to: ITransactionTo.ADD_CARD,
                    user_id: check_user._id,
                    dollar_amount: dollarAmount,
                    exchange_rate_value: RATES.EXCHANGE_RATE_VALUE,
                    exchange_rate_currency: RATES.EXCHANGE_RATE_CURRENCY,
                    currency: ICurrency.USD,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.PAYSTACK,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                },
                customerName: `${user?.first_name} ${user?.last_name}`,
            };

            const paystack_response =
                await paystackApiClient.initializeTransaction(payload);

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Paystack payment url generated successfully",
                data: {
                    url: paystack_response.data.authorization_url,
                    access_code: paystack_response.data.access_code,
                    reference: paystack_response.data.reference,
                },
            });
        }

        /***********************
         *
         *
         * ADD FLUTTERWAVE NGN CARD
         */

        if (
            platform === IPaymentGateway.FLUTTERWAVE &&
            card_currency === ICurrency.NGN
        ) {
            const rate = await exchangeRateRepository.getOne({ is_default: true });
            const buy_rate =
                Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
            // const fee = paystack_charge(RATES.ADD_CARD_AMOUNT);
            const fee = 2;
            const flutterwaveAmount = RATES.ADD_CARD_AMOUNT + fee;
            const dollarAmount = RATES.ADD_CARD_AMOUNT / buy_rate;

            const payload = {
                tx_ref: reference,
                email: user?.email!,
                amount: flutterwaveAmount,
                currency: ICurrency.NGN,
                redirect_url: APP_CONSTANTS.REDIRECTS.ACCOUNT,
                meta: {
                    normal_amount: RATES.ADD_CARD_AMOUNT,
                    transaction_to: ITransactionTo.ADD_CARD,
                    user_id: check_user._id,
                    dollar_amount: dollarAmount,
                    currency: ICurrency.NGN,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.FLUTTERWAVE,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                    exchange_rate_value: buy_rate,
                    exchange_rate_currency: rate?.currency,
                },
                customer: {
                    transaction_to: ITransactionTo.WALLET,
                    user_id: check_user._id,
                    email: check_user.email,
                },
                customizations: {
                    title: "Add Card",
                    logo: "https://staging.keble.co/svgs/keble-logo-black.svg",
                },
            };

            const flutterwave_response =
                await flutterwaveApiClient.initializeTransaction(payload);

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment url generated successfully",
                data: {
                    url: flutterwave_response.data.link,
                    reference: reference,
                },
            });
        }

        /***********************
         *
         *
         * ADD FLUTTERWAVE USD CARD
         *
         */

        if (
            platform === IPaymentGateway.FLUTTERWAVE &&
            card_currency === ICurrency.USD
        ) {
            const fee = flutterwave_usd_charge(RATES.ADD_CARD_AMOUNT_DOLLAR);
            const flutterwaveAmount = RATES.ADD_CARD_AMOUNT_DOLLAR + fee;

            const payload = {
                tx_ref: reference,
                email: user?.email!,
                amount: flutterwaveAmount,
                currency: ICurrency.USD,
                redirect_url: APP_CONSTANTS.REDIRECTS.ACCOUNT,
                meta: {
                    normal_amount: RATES.ADD_CARD_AMOUNT_DOLLAR,
                    transaction_to: ITransactionTo.ADD_CARD,
                    user_id: check_user._id,
                    dollar_amount: flutterwaveAmount,
                    currency: ICurrency.USD,
                    payment_reference: reference,
                    transaction_hash,
                    payment_gateway: IPaymentGateway.FLUTTERWAVE,
                    chargeType: IChargeType.ONE_TIME_PAYMENT,
                    exchange_rate_value: RATES.EXCHANGE_RATE_VALUE,
                    exchange_rate_currency: RATES.EXCHANGE_RATE_CURRENCY,
                },
                customer: {
                    transaction_to: ITransactionTo.WALLET,
                    user_id: check_user._id,
                    email: check_user.email,
                },
                customizations: {
                    title: "Add Card",
                    logo: "https://staging.keble.co/svgs/keble-logo-black.svg",
                },
            };

            const flutterwave_response =
                await flutterwaveApiClient.initializeTransaction(payload);

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment url generated successfully",
                data: {
                    url: flutterwave_response.data.link,
                    reference: reference,
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

/****
 *
 *
 * Delete Card
 */

export async function deleteCard(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const card = await cardsRepository.getOne({ _id: req.params.card_id });

        if (!card) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Card does not exist`,
            });
        }

        const deleted = await cardsRepository.deleteOne({
            $and: [{ user_id: user._id }, { _id: req.params.card_id }],
        });

        if (deleted) {
            // Bank Discord Notification
            const discordMessage = `
            First Name:- ${user?.first_name!},
            Last Name:- ${user?.last_name!},
            Email:- ${user?.email!},
            path:- ${req.originalUrl}
          `;
            await DiscordTaskJob({
                name: "Card Deleted",
                data: {
                    title: `Card deletion | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });

            // Audit
            await auditRepository.create({
                req,
                title: "Card deleted successfully",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Successfully deleted card",
            });
        }
    } catch (error) {
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// /****
//  *
//  *
//  * Assign Default
//  */

export async function assignDefault(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const card = await cardsRepository.getOne({
            user_id: user._id,
            _id: req.params.card_id,
        });

        if (!card) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Card does not exist`,
            });
        }

        if (card.is_default) {
            // Card Discord Notification
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${user?.email!},
        path:- ${req.originalUrl},
        Card:- ${card.last4},
        Default:- ${card.is_default}

      `;
            await DiscordTaskJob({
                name: "Card already Default",
                data: {
                    title: `Card already Default | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: "Card already Default",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `Card already Default`,
            });
        }

        await cardsRepository.updateAll(
            { user_id: user._id },
            { $set: { is_default: false } }
        );

        const update = await cardsRepository.updateOne(
            { _id: req.params.card_id },
            { $set: { is_default: true } }
        );

        if (update) {
            // Bank Discord Notification
            const discordMessage = `
            First Name:- ${user?.first_name!},
            Last Name:- ${user?.last_name!},
            Email:- ${user?.email!},
            path:- ${req.originalUrl},
            Card:- ${card.is_default},
            Default:- ${card.is_default}
          `;
            await DiscordTaskJob({
                name: "Default card assigned",
                data: {
                    title: `Default card assigned | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: "Default Card assigned",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
                data: discordMessage,
            });
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Default card assigned",
            });
        }
    } catch (error) {
        await serverErrorNotification(req, error, user);
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
 * Get Cards
 */

export async function getCards(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const cards = await cardsRepository.getAll({
            user_id: user._id,
        });
        if (cards) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Successfully fetched cards",
                data: cards,
            });
        }
    } catch (error) {
        await serverErrorNotification(req, error, user);
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
 * Get Default Card
 */

export async function getDefaultCard(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const card = await cardsRepository.getOne({
            user_id: user._id,
            is_default: true,
        });
        if (card) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Default card fetched",
                data: card,
            });
        } else {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Default card fetched",
                data: {},
            });
        }
    } catch (error) {
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
