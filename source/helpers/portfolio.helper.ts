import moment from "moment";
import mongoose, { Types } from "mongoose";
import { RATES } from "../constants/rates.constant";
import {
    IInvestmentCategory,
    IPortfolioCategory,
    IPortfolioOccurrence,
    IPortfolioStatus,
} from "../interfaces/plan.interface";
import planRepository from "../repositories/portfolio.repository";
import investmentRepository from "../repositories/investment.repository";
import {
    IEntityReference,
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import transactionRepository from "../repositories/transaction.repository";
import transaction_refRepository from "../repositories/transaction_ref.repository";
import webhookRepository from "../repositories/webhook.repository";
import { IAction } from "../interfaces/webhook.interface";
import listingRepository from "../repositories/listing.repository";
import { processReferral } from "./referral.helper";
import userRepository from "../repositories/user.repository";
import {
    IInvestmentForm,
    IInvestmentStatus,
} from "../interfaces/investment.interface";
import UtilFunctions, { getPercent, link } from "../util";
import { creditWallet } from "./wallet.helper";
import { INotificationCategory } from "../interfaces/notification.interface";
import { NotificationTaskJob } from "../services/queues/producer.service";
import investRepository from "../repositories/invest.repository";
import { ICurrency } from "../interfaces/exchange-rate.interface";

interface ICreateInvestPortfolio {
    investment_category: IInvestmentCategory;
    duration: number;
    amount: number;
    user_id: Types.ObjectId;
    plan_name: string;
    intervals: string;
    entity_reference: IEntityReference;
    plan_occurrence: IPortfolioOccurrence;
    investment_form: IInvestmentForm;
    payment_gateway: IPaymentGateway;
    listing_id: Types.ObjectId;
    transaction_medium: ITransactionMedium;
    payment_reference: string;
    transaction_hash: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    meta_data?: any;
    webhook_id?: string;
    session?: any;
    ip_address?: string;
}

// Create Portfolio
export const createInvestPortfolio = async (data: ICreateInvestPortfolio) => {
    const {
        investment_category,
        duration,
        amount,
        user_id,
        plan_name,
        intervals,
        entity_reference,
        plan_occurrence,
        investment_form,
        payment_gateway,
        listing_id,
        transaction_medium,
        payment_reference,
        transaction_hash,
        exchange_rate_value,
        exchange_rate_currency,
        meta_data,
        webhook_id,
        session,
    } = data;

    // Get a new date and calculate the end date
    const newDate = new Date();
    const end_date = moment(newDate).add(duration, "M").toDate();

    //get the rate based on RATES
    const rate = RATES.INVESTMENT_TOKEN_VALUE;

    //Calculate tokens from amount and rate
    const tokens = amount / rate;

    //Create the portfolio payload
    const portfolioPayload = {
        investment_category,
        user_id: user_id,
        plan_name,
        listing_id: listing_id,
        amount: Number(amount),
        intervals: intervals,
        total_amount: Number(amount),
        plan_occurrence: plan_occurrence,
        duration: duration,
        end_date: end_date,
        start_date: newDate,
        no_tokens: tokens,
        next_charge_date:
            plan_occurrence === IPortfolioOccurrence.RECURRING
                ? moment(newDate).add(1, "M").toDate()
                : null,
        last_charge_date:
            plan_occurrence === IPortfolioOccurrence.RECURRING
                ? new Date()
                : null,
        plan_category: IPortfolioCategory.INVESTMENT,
        session: session,
    };

    // Create portfolio
    const portfolio = await planRepository.create(portfolioPayload);

    // Create Investment Payload
    const investmentPayload = {
        user_id: user_id,
        investment_category: investment_category,
        plan: portfolio[0]._id,
        listing_id: listing_id,
        no_tokens: portfolio[0].no_tokens || 0,
        amount: amount,
        investment_occurrence: portfolio[0].plan_occurrence,
        duration: Number(portfolio[0].duration),
        start_date: portfolio[0].start_date || new Date(),
        end_date: portfolio[0].end_date || new Date(),
        investment_form,
        next_dividends_date:
            investment_category === IInvestmentCategory.FLEXIBLE
                ? moment(newDate).add(1, "M").toDate()
                : null,
        next_charge_date:
            plan_occurrence === IPortfolioOccurrence.RECURRING
                ? moment(newDate).add(1, "M").toDate()
                : null,
        last_investment_date: new Date(),
        last_dividends_date: new Date(),
        session: session,
    };

    // Create investment
    const investment = await investmentRepository.create(investmentPayload);

    // Atomic Update Portfolio
    const portfolioUpdate = await planRepository.atomicUpdate(
        portfolio[0]._id,
        { $addToSet: { investments: investment[0]._id }, $inc: { counts: 1 } },
        session
    );

    // Create transaction ref
    const transactionRef = await transaction_refRepository.create({
        amount: amount,
        transaction_hash: transaction_hash,
        user_id: user_id,
        session: session,
    });

    // Atomic update listing
    const listingUpdate = await listingRepository.atomicUpdate(
        listing_id,
        {
            $inc: {
                available_tokens: -Number(tokens),
                total_investments_made: 1,
                total_investment_amount: Number(amount),
                total_tokens_bought: Number(tokens),
            },
            $addToSet: { investors: user_id },
        },
        session
    );

    // Create transaction
    const transaction = await transactionRepository.create({
        amount: amount,
        user_id: user_id,
        currency: ICurrency.USD,
        transaction_ref: transactionRef[0]._id,
        transaction_medium: transaction_medium,
        entity_reference: entity_reference,
        entity_reference_id: portfolio[0]._id,
        sub_entity_reference_id: investment[0]._id,
        payment_gateway: payment_gateway,
        keble_transaction_type: IKebleTransactionType.INVESTMENT,
        transaction_type:
            (ITransactionType.DEBIT as ITransactionType) || undefined,
        payment_reference: payment_reference,
        transaction_hash: transaction_hash,
        exchange_rate_value: exchange_rate_value,
        exchange_rate_currency: exchange_rate_currency,
        ip_address: data.ip_address,
        transaction_status: ITransactionStatus.SUCCESSFUL,
        description: `${plan_name} plan worth ${amount} ${ICurrency.USD} was successfully created.`,
        meta_data: meta_data,
        sender: null,
        recipient: null,
        note: null,
        wallet_transaction_type:
            transaction_medium === ITransactionMedium.WALLET
                ? IWalletTransactionType.DEBIT_WALLET
                : undefined,

        // transaction_to: ITransactionTo.INVESTMENT,
        session: session,
    });

    //Save webhook
    const webhook = await webhookRepository.create({
        platform: payment_gateway,
        action: IAction.WEBHOOK_SAVED,
        webhook_id: webhook_id ? webhook_id : "",
        data: meta_data,
        session: session,
    });

    // Process referral
    const referral = await processReferral(user_id, amount, data.session);

    // Update User Total Invested
    const update_total_invested = await userRepository.atomicUpdate(
        user_id,
        { $inc: { total_amount_invested: Number(amount) } },
        session
    );

    // Update Investment with transaction_id
    const update_investment = await investmentRepository.atomicUpdate(
        new Types.ObjectId(investment[0]._id),
        {
            $set: { transaction_id: transaction[0]._id },
        },
        session
    );

    // Return success message on successful completion of all processes
    return {
        success: true,
        message: `${portfolio[0].plan_name} created successfully`,
        data: {
            portfolio,
            portfolioUpdate,
            investment,
            listingUpdate,
            transactionRef,
            transaction,
            webhook,
            referral: referral ? referral.data : null,
            update_investment,
            update_total_invested,
        },
    };
};

interface ITopUpPayload {
    user_id: Types.ObjectId;
    plan: Types.ObjectId;
    amount: number;
    listing_id: Types.ObjectId;
    payment_gateway: IPaymentGateway;
    transaction_hash: string;
    payment_reference: string;
    transaction_medium: ITransactionMedium;
    investment_form: IInvestmentForm;
    entity_reference: IEntityReference;
    webhook_id?: string;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    next_charge_date?: Date;
    ip_address?: string;
    is_auto_reinvested?: boolean;
    reinvested_as?: string;
    reinvested_from?: Types.ObjectId;
    meta_data?: any;
    session: any;
}

// Create Investment Top Up
export const topUpInvestPortfolio = async (data: ITopUpPayload) => {
    try {
        const {
            amount,
            user_id,
            plan,
            payment_gateway,
            listing_id,
            transaction_medium,
            entity_reference,
            payment_reference,
            transaction_hash,
            exchange_rate_value,
            exchange_rate_currency,
            investment_form,
            meta_data,
            webhook_id,
            is_auto_reinvested,
            reinvested_as,
            reinvested_from,
            session,
        } = data;

        const rate = RATES.INVESTMENT_TOKEN_VALUE;

        const tokens = amount / rate;

        const getPortfolio = await planRepository.getOne({ _id: plan });

        if (!getPortfolio) {
            return {
                success: false,
                message: `Portfolio does not exist (helper)`,
            };
        }

        const newDate = new Date();
        const end_date = moment(newDate)
            .add(getPortfolio.duration, "M")
            .toDate();

        const investment_id = new Types.ObjectId();

        console.log("Before Transaction Ref");
        // Save Transaction Ref
        const transactionRef = await transaction_refRepository.create({
            amount: amount,
            transaction_hash: transaction_hash,
            user_id: user_id,
            session,
        });

        console.log("After Transaction Ref");

        console.log("Before Transaction");
        // Save Transaction
        const transaction = await transactionRepository.create({
            amount: amount,
            user_id: user_id,
            currency: ICurrency.USD,
            transaction_ref: transactionRef[0]._id,
            transaction_medium: transaction_medium,
            entity_reference: entity_reference,
            entity_reference_id: getPortfolio._id,
            sub_entity_reference_id: String(investment_id),
            payment_gateway: payment_gateway,
            keble_transaction_type: IKebleTransactionType.INVESTMENT,
            transaction_type:
                payment_gateway === IPaymentGateway.REINVEST
                    ? ITransactionType.REINVEST
                    : ITransactionType.DEBIT,
            payment_reference: payment_reference,
            transaction_hash: transaction_hash,
            exchange_rate_value: exchange_rate_value,
            exchange_rate_currency: exchange_rate_currency,
            ip_address: data.ip_address,
            transaction_status: ITransactionStatus.SUCCESSFUL,
            description: `${amount}${ICurrency.USD} was successfully added to ${getPortfolio.plan_name} portfolio. `,
            meta_data: meta_data,
            sender: null,
            recipient: null,
            note: null,
            // transaction_to: ITransactionTo.INVESTMENT,
            session,
        });

        console.log(
            "?????????????????????????????????????????????????",
            transaction
        );

        console.log("After Transaction");

        console.log("Before Investment");
        const investmentPayload = {
            _id: investment_id,
            user_id: user_id,
            plan: getPortfolio._id,
            investment_category: getPortfolio.investment_category,
            listing_id: listing_id,
            no_tokens: Number(tokens),
            amount: amount,
            investment_occurrence: getPortfolio.plan_occurrence,
            duration: Number(getPortfolio.duration),
            start_date: newDate,
            end_date: end_date,
            investment_form,
            is_auto_reinvested: is_auto_reinvested,
            next_dividends_date:
                getPortfolio.investment_category ===
                IInvestmentCategory.FLEXIBLE
                    ? moment(newDate).add(1, "M").toDate()
                    : null,
            next_charge_date:
                getPortfolio.plan_occurrence ===
                    IPortfolioOccurrence.RECURRING &&
                getPortfolio.plan_status === IPortfolioStatus.RESUME
                    ? moment(newDate).add(1, "M").toDate()
                    : null,
            last_dividends_date: new Date(),
            reinvested_as: reinvested_as,
            reinvested_from: reinvested_from,
            transaction_id: transaction[0]._id,
            session: session,
        };

        const investment = await investmentRepository.create(investmentPayload);

        console.log("After Investment");

        console.log("Before Portfolio Update");
        // Update Portfolio
        const portfolioUpdate = await planRepository.atomicUpdate(
            getPortfolio._id,
            {
                $set: {
                    next_charge_date:
                        getPortfolio.plan_occurrence ===
                            IPortfolioOccurrence.RECURRING &&
                        getPortfolio.plan_status === IPortfolioStatus.RESUME
                            ? moment().add(1, "M").toDate()
                            : null,
                    last_charge_date:
                        getPortfolio.plan_occurrence ===
                        IPortfolioOccurrence.RECURRING
                            ? new Date()
                            : null,
                },
                $inc: {
                    no_tokens: Number(tokens),
                    total_amount: amount,
                    counts:
                        getPortfolio.plan_occurrence ===
                            IPortfolioOccurrence.RECURRING &&
                        getPortfolio.plan_status === IPortfolioStatus.RESUME
                            ? 1
                            : 0,
                },
                $addToSet: { investments: investment[0]._id },
            },
            session
        );

        console.log("After Portfolio Update");

        console.log("Before Webhook");
        // Save webhook
        const webhook = await webhookRepository.create({
            platform: payment_gateway,
            action: IAction.WEBHOOK_SAVED,
            webhook_id: String(webhook_id),
            data: meta_data,
            session: session,
        });

        console.log("After Webhook");

        return {
            success: true,
            message: `${getPortfolio.plan_name} topup successfully`,
            data: {
                investment,
                portfolioUpdate,
                transactionRef,
                transaction,
                webhook,
            },
        };
    } catch (e: any) {
        return {
            success: false,
            message: e,
        };
    }
};

/************************************************
 * **********************************************
 *
 * PROCESS CASH DIVIDENDS
 */

export async function process_cash_dividends() {
    const session = await mongoose.startSession();
    session.startTransaction();

    const investments = await investRepository.find({
        $or: [
            { investment_category: IInvestmentCategory.FIXED },
            { investment_category: IInvestmentCategory.FLEXIBLE },
        ],
        next_dividends_date: { $lte: new Date() },
    });

    for (const investment of investments as any[]) {
        const {
            investment_status,
            user_id,
            amount,
            duration,
            dividends_count,
            _id,
            listing_id,
            next_dividends_date,
        } = investment;

        if (investment_status === IInvestmentStatus.INVESTMENT_ACTIVE) {
            const listing = await listingRepository.getOne({ _id: listing_id });

            const total_cash_dividends = amount * getPercent(listing?.returns!);

            const monthly_dividends = total_cash_dividends / duration;

            if (
                next_dividends_date < new Date() &&
                next_dividends_date.getMonth() !== new Date().getMonth() &&
                next_dividends_date.getFullYear() !==
                    new Date().getFullYear() &&
                dividends_count < duration
            ) {
                const reference = UtilFunctions.generateTXRef();
                const transaction_hash = UtilFunctions.generateTXHash();

                const creditPayload: {
                    amount: number;
                    user_id: Types.ObjectId;
                    currency: ICurrency;
                    payment_gateway: IPaymentGateway;
                    reference: string;
                    transaction_hash: string;
                    description: string;
                    transaction_to: ITransactionTo;
                    wallet_transaction_type: IWalletTransactionType;
                } = {
                    amount: monthly_dividends,
                    user_id,
                    currency: ICurrency.USD,
                    payment_gateway: IPaymentGateway.KEBLE,
                    reference,
                    transaction_hash,
                    description: `Dividend Top Up.`,
                    transaction_to: ITransactionTo.WALLET,
                    wallet_transaction_type:
                        IWalletTransactionType.INTEREST_RECEIVED,
                };

                const result = await creditWallet({
                    data: creditPayload,
                    session,
                });

                if (!result.success) {
                    await session.abortTransaction();
                }

                await NotificationTaskJob({
                    name: "User Notification",
                    data: {
                        user_id,
                        title: "Wallet Dividends Funding",
                        notification_category: INotificationCategory.WALLET,
                        content: `Wallet topped up: $${monthly_dividends}`,
                        action_link: `${link()}/wallet`,
                    },
                });

                await investmentRepository.atomicUpdate(
                    new Types.ObjectId(_id),
                    {
                        $set: {
                            next_dividends_date: moment(next_dividends_date)
                                .add(1, "M")
                                .toDate(),
                            last_dividends_date: new Date(),
                        },
                        $inc: {
                            cash_dividend: monthly_dividends,
                            dividends_count: 1,
                        },
                    },
                    session
                );
            }
        }
    }
}

// /************************************************
//  * **********************************************
//  *
//  * PROCESS CASH DIVIDENDS & CAPITAL APPRECIATION (GROWTH)
//  */

// export async function process_capital_appreciation_dividends() {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     const investments = await investmentRepository.find({
//         investment_category: IInvestmentCategory.GROWTH,
//         next_disbursement_date: { $lte: new Date() },
//     });

//     for (const investment of investments as any[]) {
//         const {
//             investment_status,
//             user_id,
//             amount,
//             duration,
//             dividends_count,
//             _id,
//             listing_id,
//             next_dividends_date,
//         } = investment;

//         if (investment_status === IInvestmentStatus.INVESTMENT_ACTIVE) {
//             const listing = await listingRepository.getOne({ _id: listing_id });

//             const total_cash_dividends = amount * getPercent(listing?.returns!);
//             const total_capital_appreciation =
//                 amount * getPercent(listing?.capital_appreciation!);

//             const monthly_dividends = total_cash_dividends / duration;
//             const monthly_appreciation = total_capital_appreciation / duration;

//             if (
//                 next_dividends_date < new Date() &&
//                 next_dividends_date.getMonth() !== new Date().getMonth() &&
//                 next_dividends_date.getFullYear() !==
//                     new Date().getFullYear() &&
//                 dividends_count < duration
//             ) {
//                 const reference = UtilFunctions.generateTXRef();
//                 const transaction_hash = UtilFunctions.generateTXHash();

//                 const creditDividends: {
//                     amount: number;
//                     user_id: Types.ObjectId;
//                     currency: string;
//                     payment_gateway: string;
//                     reference: string;
//                     transaction_hash: string;
//                     description: string;
//                 } = {
//                     amount: monthly_dividends,
//                     user_id,
//                     currency: ICurrency.USD,
//                     payment_gateway: IPaymentGateway.KEBLE,
//                     reference,
//                     transaction_hash,
//                     description: `Dividend Top Up.`,
//                 };

//                 const creditAppreciation: {
//                     amount: number;
//                     user_id: Types.ObjectId;
//                     currency: string;
//                     payment_gateway: string;
//                     reference: string;
//                     transaction_hash: string;
//                     description: string;
//                 } = {
//                     amount: monthly_appreciation,
//                     user_id,
//                     currency: ICurrency.USD,
//                     payment_gateway: IPaymentGateway.KEBLE,
//                     reference,
//                     transaction_hash,
//                     description: `Capital Appreciation Top Up.`,
//                 };

//                 const result = await Promise.all([
//                     creditWallet({ data: creditDividends, session }),
//                     creditWallet({ data: creditAppreciation, session }),
//                 ]);

//                 const failedTxns = result.filter((res) => !res.success);

//                 if (failedTxns.length > 0) {
//                     await session.abortTransaction();
//                 }

//                 await NotificationTaskJob({
//                     name: "User Notification",
//                     data: {
//                         user_id,
//                         title: "Wallet Dividends Funding",
//                         notification_category: INotificationCategory.WALLET,
//                         content: `Wallet topped up: $${monthly_dividends}`,
//                         action_link: `${link()}/wallet`,
//                     },
//                 });

//                 await investmentRepository.atomicUpdate(
//                     new Types.ObjectId(_id),
//                     {
//                         $set: {
//                             next_dividends_date: moment(next_dividends_date)
//                                 .add(1, "M")
//                                 .toDate(),
//                             last_dividends_date: new Date(),
//                         },
//                         $inc: {
//                             cash_dividend: monthly_dividends,
//                             appreciation_dividend: monthly_appreciation,
//                             dividends_count: 1,
//                         },
//                     },
//                     session
//                 );
//             }
//         }
//     }
// }
