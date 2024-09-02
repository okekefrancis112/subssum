import moment from "moment";
import mongoose, { Types } from "mongoose";
import { RATES } from "../constants/rates.constant";
import {
    IPaymentCategory,
    IPaymentOccurrence,
    IPaymentStatus,
} from "../interfaces/payment.interface";
import paymentRepository from "../repositories/payment.repository";
// import investmentRepository from "../repositories/investment.repository";
import {
    IEntityReference,
    IsubssumTransactionType,
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
// import listingRepository from "../repositories/listing.repository";
import { processReferral } from "./referral.helper";
import userRepository from "../repositories/user.repository";
// import {
//     IInvestmentForm,
//     IInvestmentStatus,
// } from "../interfaces/investment.interface";
import UtilFunctions, { getPercent, link } from "../util";
import { creditWallet } from "./wallet.helper";
import { NotificationTaskJob } from "../services/queues/producer.service";
// import investRepository from "../repositories/invest.repository";
import { ICurrency } from "../interfaces/exchange-rate.interface";

interface ICreateInvestpayment {
    duration: number;
    amount: number;
    user_id: Types.ObjectId;
    payment_name: string;
    intervals: string;
    entity_reference: IEntityReference;
    payment_occurrence: IPaymentOccurrence;
    // investment_form: IInvestmentForm;
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

// Create payment
export const createInvestpayment = async (data: ICreateInvestpayment) => {
    const {
        duration,
        amount,
        user_id,
        payment_name,
        intervals,
        entity_reference,
        payment_occurrence,
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

    //Create the payment payload
    const paymentPayload = {
        user_id: user_id,
        payment_name,
        listing_id: listing_id,
        amount: Number(amount),
        intervals: intervals,
        total_amount: Number(amount),
        payment_occurrence: payment_occurrence,
        duration: duration,
        end_date: end_date,
        start_date: newDate,
        no_tokens: tokens,
        next_charge_date:
            payment_occurrence === IPaymentOccurrence.RECURRING
                ? moment(newDate).add(1, "M").toDate()
                : null,
        last_charge_date:
            payment_occurrence === IPaymentOccurrence.RECURRING
                ? new Date()
                : null,
        payment_category: IPaymentCategory.AIRTIME,
        session: session,
    };

    // Create payment
    const payment = await paymentRepository.create(paymentPayload);

    // Create Investment Payload
    const investmentPayload = {
        user_id: user_id,
        payment: payment[0]._id,
        listing_id: listing_id,
        no_tokens: payment[0].no_tokens || 0,
        amount: amount,
        investment_occurrence: payment[0].payment_occurrence,
        duration: Number(payment[0].duration),
        start_date: payment[0].start_date || new Date(),
        end_date: payment[0].end_date || new Date(),
        next_charge_date:
            payment_occurrence === IPaymentOccurrence.RECURRING
                ? moment(newDate).add(1, "M").toDate()
                : null,
        last_investment_date: new Date(),
        last_dividends_date: new Date(),
        session: session,
    };

    // Create investment
    // const investment = await investmentRepository.create(investmentPayload);

    // Atomic Update payment
    // const paymentUpdate = await paymentRepository.atomicUpdate(
    //     payment[0]._id,
    //     { $addToSet: { investments: investment[0]._id }, $inc: { counts: 1 } },
    //     session
    // );

    // Create transaction ref
    const transactionRef = await transaction_refRepository.create({
        amount: amount,
        transaction_hash: transaction_hash,
        user_id: user_id,
        session: session,
    });

    // Atomic update listing
    // const listingUpdate = await listingRepository.atomicUpdate(
    //     listing_id,
    //     {
    //         $inc: {
    //             available_tokens: -Number(tokens),
    //             total_investments_made: 1,
    //             total_investment_amount: Number(amount),
    //             total_tokens_bought: Number(tokens),
    //         },
    //         $addToSet: { investors: user_id },
    //     },
    //     session
    // );

    // Create transaction
    const transaction = await transactionRepository.create({
        amount: amount,
        user_id: user_id,
        currency: ICurrency.USD,
        transaction_ref: transactionRef[0]._id,
        transaction_medium: transaction_medium,
        entity_reference: entity_reference,
        entity_reference_id: payment[0]._id,
        // sub_entity_reference_id: investment[0]._id,
        payment_gateway: payment_gateway,
        subssum_transaction_type: IsubssumTransactionType.INVESTMENT,
        transaction_type:
            (ITransactionType.DEBIT as ITransactionType) || undefined,
        payment_reference: payment_reference,
        transaction_hash: transaction_hash,
        exchange_rate_value: exchange_rate_value,
        exchange_rate_currency: exchange_rate_currency,
        ip_address: data.ip_address,
        transaction_status: ITransactionStatus.SUCCESSFUL,
        description: `${payment_name} payment worth ${amount} ${ICurrency.USD} was successfully created.`,
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
    // const update_investment = await investmentRepository.atomicUpdate(
    //     new Types.ObjectId(investment[0]._id),
    //     {
    //         $set: { transaction_id: transaction[0]._id },
    //     },
    //     session
    // );

    // Return success message on successful completion of all processes
    return {
        success: true,
        message: `${payment[0].payment_name} created successfully`,
        data: {
            payment,
            // paymentUpdate,
            // investment,
            // listingUpdate,
            transactionRef,
            transaction,
            webhook,
            referral: referral ? referral.data : null,
            // update_investment,
            update_total_invested,
        },
    };
};

interface ITopUpPayload {
    user_id: Types.ObjectId;
    payment: Types.ObjectId;
    amount: number;
    listing_id: Types.ObjectId;
    payment_gateway: IPaymentGateway;
    transaction_hash: string;
    payment_reference: string;
    transaction_medium: ITransactionMedium;
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
export const topUpInvestpayment = async (data: ITopUpPayload) => {
    try {
        const {
            amount,
            user_id,
            payment,
            payment_gateway,
            listing_id,
            transaction_medium,
            entity_reference,
            payment_reference,
            transaction_hash,
            exchange_rate_value,
            exchange_rate_currency,
            meta_data,
            webhook_id,
            is_auto_reinvested,
            reinvested_as,
            reinvested_from,
            session,
        } = data;

        const rate = RATES.INVESTMENT_TOKEN_VALUE;

        const tokens = amount / rate;

        const getpayment = await paymentRepository.getOne({ _id: payment });

        if (!getpayment) {
            return {
                success: false,
                message: `payment does not exist (helper)`,
            };
        }

        const newDate = new Date();
        const end_date = moment(newDate)
            .add(getpayment.duration, "M")
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
            entity_reference_id: getpayment._id,
            sub_entity_reference_id: String(investment_id),
            payment_gateway: payment_gateway,
            subssum_transaction_type: IsubssumTransactionType.INVESTMENT,
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
            description: `${amount}${ICurrency.USD} was successfully added to ${getpayment.payment_name} payment. `,
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
            payment: getpayment._id,
            listing_id: listing_id,
            no_tokens: Number(tokens),
            amount: amount,
            investment_occurrence: getpayment.payment_occurrence,
            duration: Number(getpayment.duration),
            start_date: newDate,
            end_date: end_date,
            is_auto_reinvested: is_auto_reinvested,
            next_charge_date:
                getpayment.payment_occurrence ===
                    IPaymentOccurrence.RECURRING &&
                getpayment.payment_status === IPaymentStatus.RESUME
                    ? moment(newDate).add(1, "M").toDate()
                    : null,
            last_dividends_date: new Date(),
            reinvested_as: reinvested_as,
            reinvested_from: reinvested_from,
            transaction_id: transaction[0]._id,
            session: session,
        };

        // const investment = await investmentRepository.create(investmentPayload);

        console.log("After Investment");

        console.log("Before payment Update");
        // Update payment
        const paymentUpdate = await paymentRepository.atomicUpdate(
            getpayment._id,
            {
                $set: {
                    next_charge_date:
                        getpayment.payment_occurrence ===
                            IPaymentOccurrence.RECURRING &&
                        getpayment.payment_status === IPaymentStatus.RESUME
                            ? moment().add(1, "M").toDate()
                            : null,
                    last_charge_date:
                        getpayment.payment_occurrence ===
                        IPaymentOccurrence.RECURRING
                            ? new Date()
                            : null,
                },
                $inc: {
                    no_tokens: Number(tokens),
                    total_amount: amount,
                    counts:
                        getpayment.payment_occurrence ===
                            IPaymentOccurrence.RECURRING &&
                        getpayment.payment_status === IPaymentStatus.RESUME
                            ? 1
                            : 0,
                },
                // $addToSet: { investments: investment[0]._id },
            },
            session
        );

        console.log("After payment Update");

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
            message: `${getpayment.payment_name} topup successfully`,
            data: {
                // investment,
                paymentUpdate,
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
