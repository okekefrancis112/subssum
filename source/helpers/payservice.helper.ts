import { flutterwaveApiClient } from "../integrations/flutterwaveApiClient";
import { paystackApiClient } from "../integrations/paystackApiClient";
import { ICardsDocument } from "../interfaces/cards.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";
import { IPortfolioOccurrence } from "../interfaces/plan.interface";
import { IPaymentGateway } from "../interfaces/transaction.interface";
import { IUserDocument } from "../interfaces/user.interface";

export async function PaystackPayService({
    user,
    get_card,
    service_amount,
    default_choice,
    callback_url,
    channels,
    normal_amount,
    investment_category,
    investment_type,
    plan_name,
    intervals,
    plan_occurrence,
    duration,
    listing_id,
    plan,
    transaction_to,
    dollar_amount,
    exchange_rate_value,
    exchange_rate_currency,
    currency,
    payment_reference,
    transaction_hash,
}: {
    user: IUserDocument;
    get_card: ICardsDocument | null;
    default_choice: string;
    service_amount: number;
    callback_url: string;
    channels: string[];
    normal_amount: number;
    investment_category?: string;
    investment_type?: string;
    plan_name?: string;
    intervals?: string;
    plan_occurrence?: string;
    duration?: number;
    listing_id?: string;
    plan?: string;
    transaction_to: string;
    dollar_amount: number;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    currency?: string;
    payment_reference?: string;
    transaction_hash?: string;
}) {
    const payload = {
        email: user?.email!,
        amount: service_amount,
        callback_url: `${callback_url}?success=${true}`,
        channels: channels,
        metadata: {
            normal_amount,
            investment_category,
            investment_type,
            plan_name,
            intervals,
            plan_occurrence,
            duration,
            listing_id,
            plan,
            transaction_to,
            user_id: user._id,
            dollar_amount: dollar_amount,
            exchange_rate_value,
            exchange_rate_currency,
            currency: currency,
            payment_reference,
            transaction_hash,
            payment_gateway: IPaymentGateway.PAYSTACK,
            chargeType:
                plan_occurrence === IPortfolioOccurrence.RECURRING
                    ? IPortfolioOccurrence.RECURRING
                    : IPortfolioOccurrence.ONE_TIME_PAYMENT,
        },
        customerName: `${user?.first_name} ${user?.last_name}`,
    };

    const [apiCall] = await Promise.all([
        get_card && default_choice === "yes"
            ? await paystackApiClient.recurringCharge({
                  customerName: `${user?.first_name} ${user?.last_name}`,
                  email: user?.email!,
                  amount: service_amount,
                  metadata: {
                      normal_amount,
                      investment_category,
                      investment_type,
                      plan_name,
                      intervals,
                      plan_occurrence,
                      duration,
                      listing_id,
                      plan,
                      transaction_to,
                      user_id: user._id,
                      dollar_amount,
                      exchange_rate_value,
                      exchange_rate_currency,
                      currency: ICurrency.USD,
                      payment_reference,
                      transaction_hash,
                      payment_gateway: IPaymentGateway.PAYSTACK,
                      chargeType:
                          plan_occurrence === IPortfolioOccurrence.RECURRING
                              ? IPortfolioOccurrence.RECURRING
                              : IPortfolioOccurrence.ONE_TIME_PAYMENT,
                  },
                  authorization_code: String(get_card?.authorization_code),
              })
            : await paystackApiClient.initializeTransaction(payload),
    ]);

    const data = {
        url: apiCall.data.authorization_url,
        access_code: apiCall.data.access_code,
        reference: apiCall.data.reference,
    };

    return data;
}

// FLUTTERWAVE PAYMENT SERVICE

export async function FlutterwavePayService({
    user,
    get_card,
    service_amount,
    default_choice,
    callback_url,
    flutterwave_channel,
    normal_amount,
    investment_category,
    investment_type,
    plan_name,
    intervals,
    plan_occurrence,
    duration,
    plan,
    listing_id,
    transaction_to,
    dollar_amount,
    exchange_rate_value,
    exchange_rate_currency,
    currency,
    payment_reference,
    transaction_hash,
}: {
    user: IUserDocument;
    get_card: ICardsDocument | null;
    default_choice: string;
    service_amount: number;
    callback_url: string;
    flutterwave_channel: string;
    normal_amount: number;
    investment_category?: string;
    investment_type?: string;
    plan_name?: string;
    intervals?: string;
    plan_occurrence?: string;
    duration?: number;
    listing_id?: string;
    plan?: string;
    transaction_to: string;
    dollar_amount: number;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    currency: string;
    payment_reference?: string;
    transaction_hash?: string;
}) {
    const payload = {
        tx_ref: String(payment_reference),
        email: user?.email!,
        amount: service_amount,
        currency,
        redirect_url: callback_url,
        payment_options: flutterwave_channel,
        meta: {
            normal_amount,
            investment_category,
            investment_type,
            plan_name,
            channels: flutterwave_channel,
            intervals,
            plan_occurrence,
            listing_id,
            plan,
            duration,
            transaction_to,
            user_id: user._id,
            dollar_amount,
            currency: currency,
            payment_reference: payment_reference,
            exchange_rate_value: exchange_rate_value,
            exchange_rate_currency: exchange_rate_currency,
            transaction_hash,
            payment_gateway: IPaymentGateway.FLUTTERWAVE,
            chargeType:
                plan_occurrence === IPortfolioOccurrence.RECURRING
                    ? IPortfolioOccurrence.RECURRING
                    : IPortfolioOccurrence.ONE_TIME_PAYMENT,
        },
        customer: {
            email: user?.email!,
            transaction_to,
            user_id: user._id,
        },
        customizations: {
            title: "Keble",
            logo: "https://staging.keble.co/svgs/keble-logo-black.svg",
        },
    };

    const [flutterwaveApiCall] = await Promise.all([
        get_card && default_choice === "yes"
            ? await flutterwaveApiClient.recurringCharge({
                  token: String(get_card?.authorization_code),
                  tx_ref: String(payment_reference),
                  email: user?.email!,
                  amount: service_amount,
                  currency: currency,
                  redirect_url: callback_url,
                  meta: {
                      normal_amount,
                      investment_category,
                      investment_type,
                      plan_name,
                      channels: flutterwave_channel,
                      intervals,
                      plan_occurrence,
                      listing_id,
                      plan,
                      duration,
                      transaction_to,
                      exchange_rate_value,
                      exchange_rate_currency,
                      user_id: user._id,
                      dollar_amount,
                      currency: currency,
                      payment_reference,
                      transaction_hash,
                      payment_gateway: IPaymentGateway.FLUTTERWAVE,
                      chargeType:
                          plan_occurrence === IPortfolioOccurrence.RECURRING
                              ? IPortfolioOccurrence.RECURRING
                              : IPortfolioOccurrence.ONE_TIME_PAYMENT,
                  },
              })
            : await flutterwaveApiClient.initializeTransaction(payload),
    ]);

    const data = {
        url: flutterwaveApiCall.data.link,
        reference: payment_reference,
    };

    return data;
}
