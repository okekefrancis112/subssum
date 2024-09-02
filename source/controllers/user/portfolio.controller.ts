// import { Response } from "express";
// import { Types } from "mongoose";
// import { ExpressRequest } from "../../server";
// import ResponseHandler from "../../util/response-handler";
// import { link, throwIfUndefined } from "../../util";
// import userRepository from "../../repositories/user.repository";
// import { IpaymentStatus } from "../../interfaces/payment.interface";
// import { RATES } from "../../constants/rates.constant";
// import paymentRepository from "../../repositories/payment.repository";
// import { HTTP_CODES } from "../../constants/app_defaults.constant";

// import { NotificationTaskJob } from "../../services/queues/producer.service";
// import auditRepository from "../../repositories/audit.repository";
// import {
//     IAuditActivityStatus,
//     IAuditActivityType,
// } from "../../interfaces/audit.interface";
// import { paymentIsExist } from "../../validations/user/payment.validation";
// import investmentRepository from "../../repositories/investment.repository";

// import { IReinvest } from "../../interfaces/investment.interface";
// import { INotificationCategory } from "../../interfaces/notification.interface";
// import exchangeRateRepository from "../../repositories/exchange-rate.repository";

// import {
//     ICurrency,
//     IExchangeRateDocument,
// } from "../../interfaces/exchange-rate.interface";

// // Pause payment
// // This function pauses a payment for a user
// export async function pausepayment(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const auth = throwIfUndefined(req.user, "req.user");

//         const user = await userRepository.getById({ _id: auth._id });

//         if (!user) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this user does not exist.",
//             });
//         }

//         const payment = await paymentIsExist(
//             req,
//             new Types.ObjectId(req.params.payment_id),
//             user
//         );

//         if (!payment) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this payment does not exist.",
//             });
//         }

//         const pause = await paymentRepository.atomicUpdate(payment._id, {
//             $set: { payment_status: IpaymentStatus.PAUSE },
//         });

//         if (pause) {
//             await auditRepository.create({
//                 req,
//                 title: `Paused payment`,
//                 name: `${user.first_name} ${user.last_name}`,
//                 activity_type: IAuditActivityType.ACCESS,
//                 activity_status: IAuditActivityStatus.SUCCESS,
//                 user: user._id,
//             });

//             await NotificationTaskJob({
//                 name: "User Notification",
//                 data: {
//                     user_id: user._id,
//                     title: "Paused payment",
//                     notification_category: INotificationCategory.INVESTMENT,
//                     content: `Your recurring ${payment.payment_name} was paused.`,
//                     action_link: `${link()}/invest/info/${payment._id}`,
//                 },
//             });

//             return ResponseHandler.sendSuccessResponse({
//                 res,
//                 code: HTTP_CODES.CREATED,
//                 message: "Paused payment",
//                 data: pause,
//             });
//         }
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Resume payment
// // This function is used to resume a payment for a user
// export async function resumepayment(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const auth = throwIfUndefined(req.user, "req.user");

//         const user = await userRepository.getById({ _id: auth._id });

//         if (!user) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this user does not exist.",
//             });
//         }

//         const payment = await paymentIsExist(
//             req,
//             new Types.ObjectId(req.params.payment_id),
//             user
//         );

//         if (!payment) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this payment does not exist.",
//             });
//         }

//         const resume = await paymentRepository.atomicUpdate(payment._id, {
//             $set: { payment_status: IpaymentStatus.RESUME },
//         });

//         if (resume) {
//             await auditRepository.create({
//                 req,
//                 title: `Resumed payment`,
//                 name: `${user.first_name} ${user.last_name}`,
//                 activity_type: IAuditActivityType.ACCESS,
//                 activity_status: IAuditActivityStatus.SUCCESS,
//                 user: user._id,
//             });

//             // Notification
//             await NotificationTaskJob({
//                 name: "User Notification",
//                 data: {
//                     user_id: user._id,
//                     title: "Resumed payment",
//                     notification_category: INotificationCategory.INVESTMENT,
//                     content: `You have resumed your recurring ${payment.payment_name} payment.`,
//                     action_link: `${link()}/invest/info/${payment._id}`,
//                 },
//             });

//             return ResponseHandler.sendSuccessResponse({
//                 res,
//                 code: HTTP_CODES.CREATED,
//                 message: "Resumed payment",
//                 data: resume,
//             });
//         }
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Turn On Reinvest
// // This function is used to turn on reinvest for a user
// export async function turnOnReinvest(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const auth = throwIfUndefined(req.user, "req.user");

//         const user = await userRepository.getById({ _id: auth._id });

//         if (!user) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this user does not exist.",
//             });
//         }

//         const investment = await investmentRepository.getOne(
//             new Types.ObjectId(req.params.investment_id)
//         );

//         if (!investment) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this investment does not exist.",
//             });
//         }

//         const { reinvest } = req.body;

//         if (reinvest !== "undefined" && Object.keys(reinvest).length > 0) {
//             if (
//                 reinvest !== IReinvest.BOTH &&
//                 reinvest !== IReinvest.ONLY_AMOUNT &&
//                 reinvest !== IReinvest.ONLY_RETURNS
//             ) {
//                 return ResponseHandler.sendErrorResponse({
//                     res,
//                     code: HTTP_CODES.BAD_REQUEST,
//                     error: `Invalid reinvest value. Valid values are ${IReinvest.BOTH}, ${IReinvest.ONLY_AMOUNT}, ${IReinvest.ONLY_RETURNS}`,
//                 });
//             }
//         }

//         if (investment.auto_reinvest === false) {
//             await investmentRepository.atomicUpdate(investment._id, {
//                 $set: { auto_reinvest: true, reinvest: reinvest },
//             });
//         } else {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.BAD_REQUEST,
//                 error: `Auto invest is already turned on`,
//             });
//         }

//         // Create an audit log in the database
//         await auditRepository.create({
//             req,
//             title: `User ${
//                 investment.auto_reinvest
//                     ? ` turned on `
//                     : ` turned off auto-reinvest`
//             }  | ${process.env.NODE_ENV} environment `,
//             name: `${user.first_name} ${user.last_name}`,
//             activity_type: IAuditActivityType.ACCESS,
//             activity_status: IAuditActivityStatus.SUCCESS,
//             user: user._id,
//         });

//         return ResponseHandler.sendSuccessResponse({
//             res,
//             code: HTTP_CODES.CREATED,
//             message: "Auto Invest turned on",
//         });
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Turn Off Reinvest
// // This function is used to turn off the auto reinvest feature for a user's investment.
// export async function turnOffReinvest(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const auth = throwIfUndefined(req.user, "req.user");

//         // Get User
//         const user = await userRepository.getById({ _id: auth._id });

//         if (!user) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this user does not exist.",
//             });
//         }

//         const investment = await investmentRepository.getOne(
//             new Types.ObjectId(req.params.investment_id)
//         );

//         if (!investment) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this investment does not exist.",
//             });
//         }

//         if (investment.auto_reinvest === true) {
//             await investmentRepository.atomicUpdate(investment._id, {
//                 $set: { auto_reinvest: false },
//             });
//         } else {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.BAD_REQUEST,
//                 error: `Auto invest is already turned off`,
//             });
//         }

//         await auditRepository.create({
//             req,
//             title: `User ${
//                 investment.auto_reinvest ? ` turned on ` : ` turned off`
//             }  | ${process.env.NODE_ENV} environment `,
//             name: `${user.first_name} ${user.last_name}`,
//             activity_type: IAuditActivityType.ACCESS,
//             activity_status: IAuditActivityStatus.SUCCESS,
//             user: user._id,
//         });

//         return ResponseHandler.sendSuccessResponse({
//             res,
//             code: HTTP_CODES.CREATED,
//             message: "Auto Invest turned off",
//         });
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Edit payment name
// // This function is used to edit the payment name of a user
// export async function editpayment(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const auth = throwIfUndefined(req.user, "req.user");

//         const { payment_name } = req.body;

//         const user = await userRepository.getById({ _id: auth._id });

//         if (!user) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this user does not exist.",
//             });
//         }

//         const payment = await paymentIsExist(
//             req,
//             new Types.ObjectId(req.params.payment_id),
//             user
//         );

//         if (!payment) {
//             return ResponseHandler.sendErrorResponse({
//                 res,
//                 code: HTTP_CODES.NOT_FOUND,
//                 error: "Sorry, this payment does not exist.",
//             });
//         }

//         const update = await paymentRepository.atomicUpdate(payment._id, {
//             $set: { payment_name: payment_name },
//         });

//         if (update) {
//             await auditRepository.create({
//                 req,
//                 title: `Changed payment name to ${update.payment_name}`,
//                 name: `${user.first_name} ${user.last_name}`,
//                 activity_type: IAuditActivityType.ACCESS,
//                 activity_status: IAuditActivityStatus.SUCCESS,
//                 user: user._id,
//             });

//             return ResponseHandler.sendSuccessResponse({
//                 res,
//                 code: HTTP_CODES.CREATED,
//                 message: `Changed payment name to ${update.payment_name}`,
//                 data: update,
//             });
//         }
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Get Exchange Rate
// export async function exchangeRate(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const rate = await exchangeRateRepository.getOne({ is_default: true });
//         const buy_rate =
//             Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
//         const sell_rate =
//             Number(rate?.ngn_usd_sell_rate) || RATES.EXCHANGE_RATE_VALUE;

//         return ResponseHandler.sendSuccessResponse({
//             res,
//             code: HTTP_CODES.CREATED,
//             message: "Successfully fetched exchange rate",
//             data: {
//                 buy_rate,
//                 sell_rate,
//             },
//         });
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Get New Exchange Rate
// export async function newExchangeRate(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const rate = await exchangeRateRepository.getOne({ is_default: true });

//         const ngn_usd_buy_rate =
//             Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;
//         const ngn_usd_sell_rate =
//             Number(rate?.ngn_usd_sell_rate) || RATES.EXCHANGE_RATE_VALUE;
//         const eur_usd_buy_rate = Number(rate?.eur_usd_buy_rate);
//         const eur_usd_sell_rate = Number(rate?.eur_usd_sell_rate);
//         const gbp_usd_buy_rate = Number(rate?.gbp_usd_buy_rate);
//         const gbp_usd_sell_rate = Number(rate?.gbp_usd_sell_rate);
//         const cad_usd_buy_rate = Number(rate?.cad_usd_buy_rate);
//         const cad_usd_sell_rate = Number(rate?.cad_usd_sell_rate);

//         return ResponseHandler.sendSuccessResponse({
//             res,
//             code: HTTP_CODES.CREATED,
//             message: "Successfully fetched exchange rate",
//             data: {
//                 ngn_usd_buy_rate,
//                 ngn_usd_sell_rate,
//                 eur_usd_buy_rate,
//                 eur_usd_sell_rate,
//                 gbp_usd_buy_rate,
//                 gbp_usd_sell_rate,
//                 cad_usd_buy_rate,
//                 cad_usd_sell_rate,
//             },
//         });
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }

// // Get New Exchange Rate
// export async function newExchangeRateMobile(
//     req: ExpressRequest,
//     res: Response
// ): Promise<Response | void> {
//     try {
//         const rate =
//             (await exchangeRateRepository.getOne({ is_default: true })) as IExchangeRateDocument;
//         const data: any = [];

//         const addRateToData = (
//             buyCurrency: string,
//             sellCurrency: string,
//             buyRateKey: keyof IExchangeRateDocument,
//             sellRateKey: keyof IExchangeRateDocument
//         ) => {
//             const buyRate = Number(rate[buyRateKey]);
//             const sellRate = Number(rate[sellRateKey]);

//             if (buyRate && sellRate) {
//                 data.push({
//                     buy_currency: buyCurrency,
//                     sell_currency: sellCurrency,
//                     buy_rate: buyRate,
//                     sell_rate: sellRate,
//                 });
//             }
//         };

//         addRateToData(
//             ICurrency.USD,
//             ICurrency.NGN,
//             "ngn_usd_buy_rate",
//             "ngn_usd_sell_rate"
//         );
//         addRateToData(
//             ICurrency.USD,
//             ICurrency.EUR,
//             "eur_usd_buy_rate",
//             "eur_usd_sell_rate"
//         );
//         addRateToData(
//             ICurrency.USD,
//             ICurrency.GBP,
//             "gbp_usd_buy_rate",
//             "gbp_usd_sell_rate"
//         );
//         addRateToData(
//             ICurrency.USD,
//             ICurrency.CAD,
//             "cad_usd_buy_rate",
//             "cad_usd_sell_rate"
//         );

//         return ResponseHandler.sendSuccessResponse({
//             res,
//             code: HTTP_CODES.CREATED,
//             message: "Successfully fetched exchange rate",
//             data: data,
//         });
//     } catch (error) {
//         return ResponseHandler.sendErrorResponse({
//             res,
//             code: HTTP_CODES.INTERNAL_SERVER_ERROR,
//             error: `${error}`,
//         });
//     }
// }
