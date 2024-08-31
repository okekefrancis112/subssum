import mongoose, { Types } from "mongoose";
import { IInvestmentStatus } from "../interfaces/investment.interface";
import { IInvestmentCategory } from "../interfaces/plan.interface";
import {
    IPaymentGateway,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import investRepository from "../repositories/invest.repository";
import listingRepository from "../repositories/listing.repository";
import UtilFunctions from "../util";
import { creditWallet } from "./wallet.helper";
import { ICurrency } from "../interfaces/exchange-rate.interface";
import { discordMessageHelper } from "./discord.helper";
import userRepository from "../repositories/user.repository";
import { ExpressRequest } from "../server";
import {
    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
} from "../constants/app_defaults.constant";

export async function ProcessDividends(req: ExpressRequest) {
    const session = await mongoose.startSession();

    try {
        const investment = await investRepository.find({
            investment_category: IInvestmentCategory.FLEXIBLE,
            investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
        });

        if (investment.length > 0) {
            for (const invest of investment) {
                const {
                    amount,
                    _id,
                    user_id,
                    last_dividends_date,
                    listing_id,
                    start_date,
                    end_date,
                    duration,
                    dividends_count,
                } = invest;

                if (Number(dividends_count) < duration) {
                    const today = new Date();
                    const lastDividendsDate = new Date(
                        last_dividends_date || today
                    );
                    const startDate = new Date(start_date);
                    const endDate = new Date(end_date);

                    const user = await userRepository.getOne({
                        _id: user_id,
                    });

                    const user_object = {
                        first_name: user?.first_name,
                        last_name: user?.last_name,
                        email: user?.email,
                    };

                    if (
                        today >= startDate &&
                        today <= endDate &&
                        today > lastDividendsDate &&
                        lastDividendsDate.getMonth() !== today.getMonth() &&
                        lastDividendsDate.getFullYear() !==
                            today.getFullYear() &&
                        Number(dividends_count) < duration
                    ) {
                        const listing = await listingRepository.getOne({
                            _id: listing_id,
                        });

                        if (listing) {
                            const { flexible_returns } = listing;

                            let dividends =
                                (Number(flexible_returns) / 100) *
                                    Number(amount) +
                                Number(amount) / Number(duration);

                            const transaction_hash =
                                UtilFunctions.generateTXHash();
                            const reference = UtilFunctions.generateTXRef();

                            const walletPayload = {
                                user_id: new Types.ObjectId(user_id),
                                amount: dividends,
                                currency: ICurrency.USD,
                                payment_gateway: IPaymentGateway.WALLET,
                                transaction_type: ITransactionType.CREDIT,
                                wallet_transaction_type:
                                    IWalletTransactionType.INTEREST_RECEIVED,
                                transaction_hash,
                                description: `Dividends received from ${listing.project_name}`,
                                reference: reference,
                                transaction_to: ITransactionTo.WALLET,
                            };

                            const result = await creditWallet({
                                data: walletPayload,
                                session: null,
                            });

                            if (!result.success) {
                                await session.abortTransaction();
                                await session.endSession();

                                await discordMessageHelper(
                                    req,
                                    user_object as any,
                                    `Something happened | Your transactions have been canceled. ❌`,
                                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                                    "DIVIDEND WALLET FUNDING",
                                    result
                                );
                            }
                        }
                    }
                }
            }
        }
    } catch (error: any) {
        await session.abortTransaction();
        await session.endSession();

        await discordMessageHelper(
            req,
            {} as any,
            `Something happened | Your transactions have been canceled. ❌`,
            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
            "DIVIDEND WALLET FUNDING",
            error
        );
    }
}
