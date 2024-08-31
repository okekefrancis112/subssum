import { Response } from "express";
import { Types } from "mongoose";
import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import UtilFunctions, {
    check_card_expiry,
    serverErrorNotification,
    throwIfUndefined,
} from "../../util";
import userRepository from "../../repositories/user.repository";
import {
    IPaymentGateway,
    ITransactionTo,
} from "../../interfaces/transaction.interface";
import { RATES } from "../../constants/rates.constant";
import {
    APP_CONSTANTS,
    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
    DISCORD_INVESTMENT_ERROR_PRODUCTION,
    DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
    DISCORD_INVESTMENT_INITIATED_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";

import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import {
    oldListingIsExist,
    portfolioIsExist,
} from "../../validations/user/portfolio.validation";
import cardsRepository from "../../repositories/cards.repository";
import exchangeRateRepository from "../../repositories/exchange-rate.repository";
import {
    flutterwave_usd_charge,
    paystack_charge,
} from "../../helpers/charges.helper";
import { discordMessageHelper } from "../../helpers/discord.helper";
import {
    FlutterwavePayService,
    PaystackPayService,
} from "../../helpers/payservice.helper";
import { ICurrency } from "../../interfaces/exchange-rate.interface";
import { Investment } from "../../models";

/***************************
 *
 *
 *  Create Payment Service Investment
 *
 *
 */

// Create Payment Service Investment
export async function createInvestmentPortfolioPayService(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user");
    try {
        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User does not exist",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!getUser.kyc_completed) {
            await discordMessageHelper(
                req,
                user,
                "Please complete your KYC to proceed ❌",
                DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                DISCORD_INVESTMENT_ERROR_PRODUCTION,
                "INVESTMENT"
            );
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        if (!getUser.id_verified) {
            await discordMessageHelper(
                req,
                user,
                "Please verify your ID before proceeding ❌",
                DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                DISCORD_INVESTMENT_ERROR_PRODUCTION,
                "INVESTMENT"
            );
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please verify your ID before proceeding.`,
            });
        }

        const {
            investment_category,
            investment_type,
            plan_name,
            intervals,
            plan_occurrence,
            duration,
            payment_gateway,
            is_dollar,
            default_choice,
            channel,
        } = req.body;

        const amount = Number(req.body.amount);

        if (Math.sign(amount) === -1) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please input a positive amount`,
            });
        }

        const rate = await exchangeRateRepository.getOne({ is_default: true });
        const buy_rate: number =
            Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
        const dollarAmount: number = amount / buy_rate;

        if (
            payment_gateway !== IPaymentGateway.FLUTTERWAVE &&
            Number(dollarAmount) < RATES.MINIMUM_INVESTMENT
        ) {
            // Audit
            await auditRepository.create({
                req,
                title: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
            });
        }

        const listing = await oldListingIsExist(req, duration, user);

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `No listing of ${duration} months is available`,
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            const fees = paystack_charge(amount);
            const paystackAmount = (amount + fees) * 100;

            const data = await PaystackPayService({
                user,
                get_card,
                service_amount: paystackAmount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                channels: [String(paystack_channel)],
                normal_amount: amount,
                investment_category,
                plan_name,
                intervals,
                plan_occurrence,
                duration,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.USD,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Paystack payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "PAYSTACK INVESTMENT",
                {
                    Amount: amount,
                    Fees: fees,
                    Investment_Category: investment_category,
                    Investment_Type: investment_type,
                    Duration: duration,
                }
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Paystack payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Paystack payment link generated successfully",
                data: data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ********** FLUTTERWAVE USD *******
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            if (amount > 1000 || amount < 1) {
                await discordMessageHelper(
                    req,
                    user,
                    `Please input an amount between $${RATES.MINIMUM_INVESTMENT} to $1000.❌`,
                    DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                    DISCORD_INVESTMENT_ERROR_PRODUCTION,
                    "FLUTTERWAVE INVESTMENT"
                );

                // Audit
                await auditRepository.create({
                    req,
                    title: `Please input an amount between $${RATES.MINIMUM_INVESTMENT} to $1000.`,
                    name: `${user.first_name} ${user.last_name}`,
                    activity_type: IAuditActivityType.ACCESS,
                    activity_status: IAuditActivityStatus.FAILURE,
                    user: user._id,
                });

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Please input an amount between $${RATES.MINIMUM_INVESTMENT} to $1000.`,
                });
            }

            const fees = flutterwave_usd_charge(amount);
            const flutterwave_amount = amount + fees;

            const data = await FlutterwavePayService({
                user,
                get_card,
                service_amount: flutterwave_amount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                flutterwave_channel: String(flutterwave_channel),
                normal_amount: amount,
                investment_category,
                investment_type,
                plan_name,
                intervals,
                plan_occurrence,
                duration,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.USD,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Flutterwave usd payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "FLUTTERWAVE USD INVESTMENT",
                {
                    Amount: amount,
                    Fees: fees,
                    Investment_Category: investment_category,
                    Investment_Type: investment_type,
                    Duration: duration,
                }
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Flutterwave payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment link generated successfully",
                data: data,
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

            if (
                String(is_dollar) == "false" &&
                default_choice === "yes" &&
                !get_card
            ) {
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            const fees = paystack_charge(amount);
            const flutterwave_amount = amount + fees;

            const data = await FlutterwavePayService({
                user,
                get_card,
                service_amount: flutterwave_amount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                flutterwave_channel: String(flutterwave_channel),
                normal_amount: amount,
                investment_category,
                investment_type,
                plan_name,
                intervals,
                plan_occurrence,
                duration,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.NGN,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Flutterwave ngn payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "FLUTTERWAVE NGN INVESTMENT",
                {
                    Amount: amount,
                    Fees: fees,
                    Investment_Category: investment_category,
                    Investment_Type: investment_type,
                    Duration: duration,
                }
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Flutterwave payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment link generated successfully",
                data: data,
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

/***************************
 *
 *
 *  Top Up Investment Portfolio Pay Service
 *
 *
 */

// Create Payment Service Investment
export async function topUpInvestmentPortfolioPayService(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User does not exist",
            });
        }

        // ! This part handles the investment restrictions for users without complete KYC
        if (!getUser.kyc_completed) {
            await discordMessageHelper(
                req,
                user,
                "Please complete your KYC to proceed ❌",
                DISCORD_INVESTMENT_ERROR_DEVELOPMENT,
                DISCORD_INVESTMENT_ERROR_PRODUCTION,
                "INVESTMENT"
            );
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Please complete your KYC to proceed.`,
            });
        }

        const { payment_gateway, default_choice, channel, is_dollar } =
            req.body;

        const amount = Math.trunc(Number(req.body.amount) * 10) / 10;

        const getPortfolio = await portfolioIsExist(
            req,
            new Types.ObjectId(req.params.portfolio_id),
            user
        );

        if (!getPortfolio) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Plan does not exist",
            });
        }

        const rate = await exchangeRateRepository.getOne({ is_default: true });
        const buy_rate: number =
            Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
        const dollarAmount: number = amount / buy_rate;

        if (Number(dollarAmount) < RATES.MINIMUM_INVESTMENT) {
            // Audit
            await auditRepository.create({
                req,
                title: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Minimum investment amount is $${RATES.MINIMUM_INVESTMENT}`,
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

        const listing = await oldListingIsExist(
            req,
            getPortfolio?.duration!,
            user
        );

        if (!listing) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `No listing of ${getPortfolio.duration} months is available`,
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            const fees = paystack_charge(amount);
            const paystackAmount = Number((amount + fees) * 100);

            const data = await PaystackPayService({
                user,
                get_card,
                service_amount: paystackAmount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                channels: [String(paystack_channel)],
                normal_amount: amount,
                plan: getPortfolio._id,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT_TOPUP,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.USD,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Paystack topup payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "PAYSTACK INVESTMENT TOPUP",
                { Amount: amount, Fees: fees }
            );

            // Audit
            await auditRepository.create({
                req,
                title: `Paystack payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Paystack payment link generated successfully",
                data: data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ********** FLUTTERWAVE USD TOPUP *
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            // ! The limit for dollar investment here is 1000 because flutterwave does not process amount greater than 1000

            if (amount > 1000 || amount < RATES.MINIMUM_INVESTMENT) {
                // Audit
                await auditRepository.create({
                    req,
                    title: `Please input an amount between $${RATES.MINIMUM_INVESTMENT} to $1000.`,
                    name: `${user.first_name} ${user.last_name}`,
                    activity_type: IAuditActivityType.ACCESS,
                    activity_status: IAuditActivityStatus.FAILURE,
                    user: user._id,
                });

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Please input an amount between $${RATES.MINIMUM_INVESTMENT} to $1000.`,
                });
            }

            const fees = flutterwave_usd_charge(amount);
            const flutterwave_amount = amount + fees;

            const data = await FlutterwavePayService({
                user,
                get_card,
                service_amount: flutterwave_amount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                flutterwave_channel: String(flutterwave_channel),
                normal_amount: amount,
                plan: getPortfolio._id,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT_TOPUP,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.USD,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Futterwave ngn topup payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "FLUTTERWAVE USD INVESTMENT TOPUP",
                { Amount: amount, Fees: fees }
            );
            // Audit
            await auditRepository.create({
                req,
                title: `Flutterwave payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment link generated successfully",
                data: data,
            });
        }

        /************************************
         * **********************************
         * **********************************
         *
         * ***** TOPUP FLUTTERWAVE NGN ******
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

            if (
                String(is_dollar) == "false" &&
                default_choice === "yes" &&
                !get_card
            ) {
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
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your saved card has expired",
                });
            }

            const fees: number = paystack_charge(amount);
            const flutterwave_amount = amount + fees;

            const data = await FlutterwavePayService({
                user,
                get_card,
                service_amount: flutterwave_amount,
                default_choice,
                callback_url: `${
                    APP_CONSTANTS.REDIRECTS.INVESTMENT
                }?success=${true}`,
                flutterwave_channel: String(flutterwave_channel),
                normal_amount: amount,
                plan: getPortfolio._id,
                listing_id: listing._id,
                transaction_to: ITransactionTo.INVESTMENT_TOPUP,
                dollar_amount: dollarAmount,
                exchange_rate_value: buy_rate,
                exchange_rate_currency: rate?.currency,
                currency: ICurrency.NGN,
                payment_reference: reference,
                transaction_hash,
            });

            await discordMessageHelper(
                req,
                user,
                "Flutterwave usd topup payment initiated successfully ✅",
                DISCORD_INVESTMENT_INITIATED_DEVELOPMENT,
                DISCORD_INVESTMENT_INITIATED_PRODUCTION,
                "FLUTTERWAVE USD INVESTMENT TOPUP",
                { Amount: amount, Fees: fees }
            );
            // Audit
            await auditRepository.create({
                req,
                title: `Flutterwave payment link generated successfully`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Flutterwave payment link generated successfully",
                data: data,
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
