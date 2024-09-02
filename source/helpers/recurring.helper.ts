import paymentRepository from "../repositories/payment.repository";
import {
    IPaymentIntervals,
    IPaymentOccurrence,
    IPaymentStatus,
} from "../interfaces/payment.interface";
import userRepository from "../repositories/user.repository";
import { ExpressRequest } from "../server";
// import listingRepository from "../repositories/listing.repository";
// import { IListingStatus } from "../interfaces/listing.interface";
import exchangeRateRepository from "../repositories/exchange-rate.repository";
import { RATES } from "../constants/rates.constant";
import { paystack_charge } from "./charges.helper";
import UtilFunctions, {
    areDatesInSameMonthAndYear,
    check_card_expiry,
} from "../util";
import cardsRepository from "../repositories/cards.repository";
import {
    IPaymentGateway,
    ITransactionTo,
} from "../interfaces/transaction.interface";
import { ICardStatus } from "../interfaces/cards.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";
import {
    RecurringInvestmentTaskJob,
} from "../services/queues/producer.service";
import moment from "moment";

export async function ChargeRecurring(req: ExpressRequest) {
    try {
        const get_payment = await paymentRepository.getAll({
            payment_occurrence: IPaymentOccurrence.RECURRING,
            payment_status: IPaymentStatus.RESUME,
            investments: { $exists: true, $not: { $size: 0 } },
        });

        for (let i = 0; i < get_payment.length; i++) {
            const {
                _id,
                amount,
                payment_name,
                user_id,
                payment_occurrence,
                investment_category,
                duration,
                next_charge_date,
                last_charge_date,
            } = get_payment[i];

            const user = await userRepository.getOne({ _id: user_id });

            if (!user) {

                continue;
            }

            const rate = await exchangeRateRepository.getOne({ is_default: true });

            const buy_rate =
                Number(rate?.ngn_usd_buy_rate) || RATES.EXCHANGE_RATE_VALUE;

            const format_amount = Number(amount!) * buy_rate;
            const fees = paystack_charge(format_amount);
            const paystackAmount = Math.round(
                (format_amount + Number(fees)) * 100
            );

            const dollarAmount = format_amount / buy_rate;

            const reference = UtilFunctions.generateTXRef();
            const transaction_hash = UtilFunctions.generateTXHash();

            const get_card = await cardsRepository.getOne({
                user_id: user?._id,
                is_default: true,
                platform: IPaymentGateway.PAYSTACK,
            });

            if (!get_card) {
                continue;
            }

            const is_card_valid = await check_card_expiry(
                get_card?.exp_month,
                get_card?.exp_year
            );

            if (!is_card_valid) {
                await cardsRepository.updateOne(
                    { _id: get_card?._id },
                    { is_default: false, card_status: ICardStatus.EXPIRED }
                );
                continue;
            }

            const current_date = new Date();

            const isValidNextChargeDate = areDatesInSameMonthAndYear(
                next_charge_date!,
                current_date
            );

            const months_difference = moment(current_date).diff(
                moment(last_charge_date),
                "months",
                true
            );

            if (
                next_charge_date !== null &&
                months_difference >= 1 &&
                new Date(next_charge_date) < current_date &&
                !isValidNextChargeDate
            ) {
                // const listing = await listingRepository.getOne({
                //     holding_period: duration,
                //     status: IListingStatus.ACTIVE,
                //     investment_category,
                // });

                // if (!listing) {
                //     continue;
                // }

                const investment_payload = {
                    customerName: `${user?.first_name} ${user?.last_name}`,
                    email: user?.email!,
                    amount: paystackAmount,
                    metadata: {
                        normal_amount: format_amount,
                        payment_name,
                        payment: _id,
                        intervals: IPaymentIntervals.MONTHLY,
                        payment_occurrence,
                        duration,
                        // listing_id: listing?._id,
                        transaction_to: ITransactionTo.INVESTMENT_TOPUP,
                        user_id: user?._id,
                        dollar_amount: dollarAmount,
                        exchange_rate_value: buy_rate,
                        exchange_rate_currency: rate?.currency,
                        currency: ICurrency.USD,
                        payment_reference: reference,
                        transaction_hash,
                        payment_gateway: IPaymentGateway.PAYSTACK,
                        chargeType: IPaymentOccurrence.RECURRING,
                    },
                    authorization_code: String(get_card?.authorization_code),
                };

                await RecurringInvestmentTaskJob({
                    name: "Recurring Investment Charge",
                    data: {
                        investment_payload,
                    },
                });
            }
        }
    } catch (err: any) {
        console.log(err);
    }
}
