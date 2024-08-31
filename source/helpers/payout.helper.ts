import mongoose, { Types } from "mongoose";

import { ExpressRequest } from "../server";
import {
    IInvestmentCategory,
    IPlanDocument,
} from "../interfaces/plan.interface";
import {
    IInvestmentForm,
    IInvestmentStatus,
} from "../interfaces/investment.interface";
import UtilFunctions, { formatDecimal, link, pdfSetup } from "../util";
import planRepository from "../repositories/plan.repository";
import { discordMessageHelper } from "./discord.helper";
import {
    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
    DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
    DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
} from "../constants/app_defaults.constant";
import userRepository from "../repositories/user.repository";
import listingRepository from "../repositories/listing.repository";
import { IListingStatus } from "../interfaces/listing.interface";
import {
    IEntityReference,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionTo,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import { topUpInvestPortfolio } from "./portfolio.helper";
import { RATES } from "../constants/rates.constant";
import { ICurrency } from "../interfaces/exchange-rate.interface";
import { creditWallet } from "./wallet.helper";
import moment from "moment";
import walletRepository from "../repositories/wallet.repository";
import { NotificationTaskJob } from "../services/queues/producer.service";
import { INotificationCategory } from "../interfaces/notification.interface";
import investRepository from "../repositories/invest.repository";

export async function ProcessPayouts(req: ExpressRequest) {
    const current_date = new Date().getTime();
    const investments = await investRepository.find({
        investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
        // _id: "65318acae2f7c133d0f4a6f1",
        paid_out: false,
    });

    for (const invest of investments) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                _id,
                user_id,
                amount,
                plan,
                end_date,
                listing_id,
                duration,
                investment_status,
                paid_out,
                investment_category,
                auto_reinvest,
                reinvest,
            } = invest;

            const reference = UtilFunctions.generateTXRef();
            const transaction_hash = UtilFunctions.generateTXHash();

            const get_plan = await planRepository.getOne({ _id: plan });

            if (!get_plan) {
                await discordMessageHelper(
                    req,
                    null,
                    "Plan does not exist (PAYOUT) ❌",
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "PLAN DOES NOT EXIST (PAYOUT | CRON | PROCESS PAYOUTS)"
                );
                continue;
            }

            const user = await userRepository.getOne({ _id: user_id });

            if (!user) {
                await discordMessageHelper(
                    req,
                    null,
                    "User does not exist (PAYOUT) ❌",
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "USER DOES NOT EXIST (PAYOUT | CRON | PROCESS PAYOUTS)"
                );
                continue;
            }

            const wallet = await walletRepository.getOne({ user_id: user_id });

            if (!wallet) {
                await discordMessageHelper(
                    req,
                    user,
                    "User's wallet does not exist (PAYOUT) ❌",
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "USER'S WALLET DOES NOT EXIST (PAYOUT | CRON | PROCESS PAYOUTS)"
                );
                continue;
            }

            const get_investment_listing = await listingRepository.getOne({
                _id: listing_id,
            });

            if (!get_investment_listing) {
                await discordMessageHelper(
                    req,
                    user,
                    "User (i.e. The Project the user invested in does not exist anymore)Investment listing does not exist (PAYOUT) ❌",
                    DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                    DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                    "INVESTMENT LISTING DOES NOT EXIST (PAYOUT | CRON | PROCESS PAYOUTS)"
                );
                continue;
            }

            let listing_returns: any;
            let returns: any;
            if (investment_category === IInvestmentCategory.FIXED) {
                listing_returns =
                    Number(get_investment_listing.fixed_returns) ||
                    Number(get_investment_listing.returns) ||
                    0;

                returns = Number(amount) * Number(listing_returns! / 100);
            } else if (investment_category === IInvestmentCategory.FLEXIBLE) {
                listing_returns =
                    Number(get_investment_listing.flexible_returns) ||
                    Number(get_investment_listing.returns) ||
                    0;
                returns =
                    (Number(amount) * Number(listing_returns / 100)) / duration; // Divide by duration to get the final month return not disbursed yet
            }

            if (
                end_date.getTime() < current_date &&
                investment_status === IInvestmentStatus.INVESTMENT_ACTIVE &&
                paid_out === false
            ) {
                const listing = await listingRepository.getOne({
                    holding_period: duration,
                    status: IListingStatus.ACTIVE,
                });

                if (!listing) {
                    await discordMessageHelper(
                        req,
                        user,
                        "No listing fits the investment category (PAYOUT) ❌",
                        DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                        DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                        "NO LISTING FITS THE INVESTMENT CATEGORY (PAYOUT | CRON | PROCESS PAYOUTS)"
                    );
                    continue;
                }

                if (auto_reinvest && reinvest === "only_return") {
                    const reinvestPayload = {
                        user_id: new Types.ObjectId(user_id),
                        getPortfolio: get_plan,
                        amount: Number(returns),
                        listing_id: new Types.ObjectId(listing_id),
                        transaction_hash,
                        reference,
                        is_auto_reinvested: true,
                        reinvested_as: "only_return",
                        reinvested_from: new Types.ObjectId(_id),
                        session,
                    };
                    const create_reinvest = await createInvestment(
                        reinvestPayload
                    );

                    if (!create_reinvest?.success) {
                        await session.abortTransaction();
                        await discordMessageHelper(
                            req,
                            user,
                            "Reinvestment failed (PAYOUT) ❌ (2nd Level helper function)",
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `REINVESTMENT FAILED (PAYOUT - ONLY_RETURN | CRON | PROCESS PAYOUTS) AA`
                        );
                        continue;
                    }

                    // ! Send the return to the user's wallet

                    const creditPayload = {
                        amount: Number(amount),
                        user_id: new Types.ObjectId(user_id),
                        currency: ICurrency.USD,
                        payment_gateway: IPaymentGateway.KEBLE,
                        reference: reference,
                        transaction_hash: transaction_hash,
                        description: `Payout from ${get_investment_listing.project_name} investment`,
                        wallet_transaction_type:
                            IWalletTransactionType.INTEREST_RECEIVED,
                        transaction_to: ITransactionTo.WALLET,
                    };

                    const result = await creditWallet({
                        data: creditPayload,
                        session,
                    });

                    if (!result.success) {
                        await session.abortTransaction();

                        await discordMessageHelper(
                            req,
                            user,
                            `Payout failed (PAYOUT) ❌ (Wallet funding)`,
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `PAYOUT FAILED (PAYOUT | CRON | PROCESS PAYOUTS) error message: ${result.message} BB`
                        );

                        continue;
                    }

                    await investRepository.atomicUpdate(
                        { _id: _id },
                        {
                            $set: {
                                paid_out: true,
                                investment_status:
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                paid_out_date: current_date,
                            },
                        },
                        session
                    );

                    await discordMessageHelper(
                        req,
                        user,
                        `Reinvestment successful (PAYOUT) ✅`,
                        DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
                        DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
                        "REINVESTMENT SUCCESSFUL (PAYOUT - ONLY_RETURN | CRON | PROCESS PAYOUTS) "
                    );

                    const deeds_data = {
                        transaction_id: reference,
                        name: `${user.first_name} ${user.last_name}`,
                        token: Number(returns) / RATES.INVESTMENT_TOKEN_VALUE,
                        project_name: listing.project_name,
                        date: moment(end_date).format("DD MMMM YYYY"),
                    };

                    const deeds_link = await pdfSetup(req, deeds_data, "deeds");

                    // send a top up email to the user
                    await UtilFunctions.sendEmail2("investment.hbs", {
                        to: user.email,
                        subject: "Keble Investment Deed",
                        props: {
                            email: user.email,
                            name: user.first_name,
                            project_name: listing.project_name,
                            amount: Number(returns),
                            link: deeds_link,
                            no_tokens:
                                Number(returns) / RATES.INVESTMENT_TOKEN_VALUE,
                            maturity_date:
                                moment(end_date).format("DD MMMM YYYY"),
                            createdAt: new Date().toLocaleString(),
                        },
                    });

                    const balance = wallet.balance + Number(amount);

                    await UtilFunctions.sendEmail2("fund-wallet.hbs", {
                        to: user.email,
                        subject: "Keble Wallet Top Up",
                        props: {
                            email: user.email,
                            name: user.first_name,
                            balance: formatDecimal(balance, 100),
                            amount: formatDecimal(amount, 100),
                            createdAt: new Date().toLocaleString(),
                        },
                    });

                    // Notification for funding
                    await NotificationTaskJob({
                        name: "User Notification",
                        data: {
                            user_id: user._id,
                            title: "Wallet Funding",
                            notification_category: INotificationCategory.WALLET,
                            content: `Wallet topped up: $${formatDecimal(
                                amount,
                                100
                            )}`,
                            action_link: `${link()}/wallet`,
                        },
                    });
                } else if (auto_reinvest && reinvest === "only_amount") {
                    const reinvestPayload = {
                        user_id: new Types.ObjectId(user_id),
                        getPortfolio: get_plan,
                        amount: Number(amount),
                        listing_id: new Types.ObjectId(listing_id),
                        transaction_hash,
                        reference,
                        is_auto_reinvested: true,
                        reinvested_as: "only_amount",
                        reinvested_from: new Types.ObjectId(_id),
                        session,
                    };
                    const create_reinvest = await createInvestment(
                        reinvestPayload
                    );

                    if (!create_reinvest?.success) {
                        await session.abortTransaction();
                        await discordMessageHelper(
                            req,
                            user,
                            "Reinvestment failed (PAYOUT) ❌ (2nd Level helper function)",
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `REINVESTMENT FAILED (PAYOUT - ONLY_AMOUNT | CRON | PROCESS PAYOUTS) EE`
                        );
                        continue;
                    }

                    // ! Send the return to the user's wallet

                    const creditPayload = {
                        amount: Number(returns),
                        user_id: new Types.ObjectId(user_id),
                        currency: ICurrency.USD,
                        payment_gateway: IPaymentGateway.KEBLE,
                        reference: reference,
                        transaction_hash: transaction_hash,
                        description: `Payout from ${get_investment_listing.project_name} investment`,
                        wallet_transaction_type:
                            IWalletTransactionType.INTEREST_RECEIVED,
                        transaction_to: ITransactionTo.WALLET,
                    };

                    const result = await creditWallet({
                        data: creditPayload,
                        session,
                    });

                    if (!result.success) {
                        await session.abortTransaction();

                        await discordMessageHelper(
                            req,
                            user,
                            `Payout failed (PAYOUT) ❌ (Wallet funding)`,
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `PAYOUT FAILED (PAYOUT | CRON | PROCESS PAYOUTS) error message: ${result.message} FF`
                        );

                        continue;
                    }

                    await investRepository.atomicUpdate(
                        { _id: _id },
                        {
                            $set: {
                                paid_out: true,
                                investment_status:
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                paid_out_date: current_date,
                            },
                        },
                        session
                    );

                    await discordMessageHelper(
                        req,
                        user,
                        `Reinvestment successful (PAYOUT) (Returns to be reinvested is up to ${RATES.MINIMUM_INVESTMENT}) ✅`,
                        DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
                        DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
                        "REINVESTMENT SUCCESSFUL (PAYOUT - ONLY_AMOUNT | CRON | PROCESS PAYOUTS) "
                    );

                    const deeds_data = {
                        transaction_id: reference,
                        name: `${user.first_name} ${user.last_name}`,
                        token: amount / RATES.INVESTMENT_TOKEN_VALUE,
                        project_name: listing.project_name,
                        date: moment(end_date).format("DD MMMM YYYY"),
                    };

                    const deeds_link = await pdfSetup(req, deeds_data, "deeds");

                    // send a top up email to the user
                    await UtilFunctions.sendEmail2("investment.hbs", {
                        to: user.email,
                        subject: "Keble Investment Deed",
                        props: {
                            email: user.email,
                            name: user.first_name,
                            project_name: listing.project_name,
                            amount: Number(amount),
                            link: deeds_link,
                            no_tokens: amount / RATES.INVESTMENT_TOKEN_VALUE,
                            maturity_date:
                                moment(end_date).format("DD MMMM YYYY"),
                            createdAt: new Date().toLocaleString(),
                        },
                    });

                    const balance = wallet.balance + Number(returns);

                    await UtilFunctions.sendEmail2("fund-wallet.hbs", {
                        to: user.email,
                        subject: "Keble Wallet Top Up",
                        props: {
                            email: user.email,
                            name: user.first_name,
                            balance: formatDecimal(balance, 100),
                            amount: formatDecimal(returns, 100),
                            createdAt: new Date().toLocaleString(),
                        },
                    });

                    // Notification for funding
                    await NotificationTaskJob({
                        name: "User Notification",
                        data: {
                            user_id: user._id,
                            title: "Wallet Funding",
                            notification_category: INotificationCategory.WALLET,
                            content: `Wallet topped up: $${formatDecimal(
                                returns,
                                100
                            )}`,
                            action_link: `${link()}/wallet`,
                        },
                    });
                } else if (auto_reinvest && reinvest === "both") {
                    const reinvestPayload = {
                        user_id: new Types.ObjectId(user_id),
                        getPortfolio: get_plan,
                        amount: Number(amount) + Number(returns),
                        listing_id: new Types.ObjectId(listing_id),
                        transaction_hash,
                        reference,
                        is_auto_reinvested: true,
                        reinvested_as: "both",
                        reinvested_from: new Types.ObjectId(_id),
                        session,
                    };
                    const create_reinvest = await createInvestment(
                        reinvestPayload
                    );

                    if (!create_reinvest?.success) {
                        await session.abortTransaction();
                        await discordMessageHelper(
                            req,
                            user,
                            "Reinvestment failed (PAYOUT) ❌ (2nd Level helper function)",
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `REINVESTMENT FAILED (PAYOUT - BOTH | CRON | PROCESS PAYOUTS) GG`
                        );
                        continue;
                    }

                    await investRepository.atomicUpdate(
                        { _id: _id },
                        {
                            $set: {
                                paid_out: true,
                                investment_status:
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                paid_out_date: current_date,
                            },
                        },
                        session
                    );

                    await discordMessageHelper(
                        req,
                        user,
                        `Reinvestment successful (PAYOUT) (Returns to be reinvested is up to ${RATES.MINIMUM_INVESTMENT}) ✅`,
                        DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
                        DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
                        "REINVESTMENT SUCCESSFUL (PAYOUT - BOTH | CRON | PROCESS PAYOUTS) "
                    );

                    const deeds_data = {
                        transaction_id: reference,
                        name: `${user.first_name} ${user.last_name}`,
                        token:
                            (Number(amount) + Number(returns)) /
                            RATES.INVESTMENT_TOKEN_VALUE,
                        project_name: listing.project_name,
                        date: moment(end_date).format("DD MMMM YYYY"),
                    };

                    const deeds_link = await pdfSetup(req, deeds_data, "deeds");

                    // send a top up email to the user
                    await UtilFunctions.sendEmail2("investment.hbs", {
                        to: user.email,
                        subject: "Keble Investment Deed",
                        props: {
                            email: user.email,
                            name: user.first_name,
                            project_name: listing.project_name,
                            amount: Number(amount) + Number(returns),
                            link: deeds_link,
                            no_tokens: amount / RATES.INVESTMENT_TOKEN_VALUE,
                            maturity_date:
                                moment(end_date).format("DD MMMM YYYY"),
                            createdAt: new Date().toLocaleString(),
                        },
                    });
                } else if (!auto_reinvest) {
                    // ! Send the return to the user's wallet

                    const creditPayload = {
                        amount: Number(amount) + Number(returns),
                        user_id: new Types.ObjectId(user_id),
                        currency: ICurrency.USD,
                        payment_gateway: IPaymentGateway.KEBLE,
                        reference: reference,
                        transaction_hash: transaction_hash,
                        description: `Payout from ${get_investment_listing.project_name} investment`,
                        wallet_transaction_type:
                            IWalletTransactionType.INTEREST_RECEIVED,
                        transaction_to: ITransactionTo.WALLET,
                    };

                    const result = await creditWallet({
                        data: creditPayload,
                        session,
                    });

                    if (!result.success) {
                        await session.abortTransaction();

                        await discordMessageHelper(
                            req,
                            user,
                            `Payout failed (PAYOUT) ❌ (Wallet funding)`,
                            DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT,
                            DISCORD_ERROR_WALLET_FUNDING_PRODUCTION,
                            `PAYOUT FAILED (PAYOUT | CRON | PROCESS PAYOUTS) error message: ${result.message} HH`
                        );

                        continue;
                    }

                    await investRepository.atomicUpdate(
                        { _id: _id },
                        {
                            $set: {
                                paid_out: true,
                                investment_status:
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                paid_out_date: current_date,
                            },
                        },
                        session
                    );

                    await discordMessageHelper(
                        req,
                        user,
                        `Payout successful (PAYOUT) ✅`,
                        DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT,
                        DISCORD_INVESTMENT_SUCCESS_PRODUCTION,
                        "PAYOUT SUCCESSFUL (PAYOUT | CRON | PROCESS PAYOUTS) "
                    );
                }
            }
            await session.commitTransaction();
        } catch (error: any) {
            await session.abortTransaction();
            console.log(error);
        } finally {
            session.endSession();
        }
    }
}

const createInvestment = async ({
    user_id,
    getPortfolio,
    amount,
    listing_id,
    transaction_hash,
    reference,
    is_auto_reinvested,
    reinvested_as,
    reinvested_from,
    session,
}: {
    user_id: Types.ObjectId;
    getPortfolio: IPlanDocument;
    amount: number;
    listing_id: Types.ObjectId;
    transaction_hash: string;
    reference: string;
    is_auto_reinvested: boolean;
    reinvested_as?: string;
    reinvested_from?: Types.ObjectId;
    session: any;
}) => {
    const investmentPayload = {
        user_id: user_id,
        plan: getPortfolio._id,
        amount: amount,
        listing_id: listing_id,
        payment_gateway: IPaymentGateway.REINVEST,
        transaction_hash,
        payment_reference: reference,
        investment_form: IInvestmentForm.RE_INVESTMENT,
        transaction_medium: ITransactionMedium.WALLET,
        entity_reference: IEntityReference.INVESTMENTS,
        is_auto_reinvested,
        reinvested_as,
        reinvested_from,
        session,
    };

    const investment = await topUpInvestPortfolio(investmentPayload);

    const rate = RATES.INVESTMENT_TOKEN_VALUE;
    const tokens = amount / rate;

    await listingRepository.atomicUpdate(
        { _id: listing_id },
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

    await userRepository.atomicUpdate(
        user_id,
        {
            $inc: {
                total_amount_invested: Number(amount),
            },
        },
        session
    );

    if (!investment) {
        await session.abortTransaction();
        return null;
    } else {
        return investment;
    }
};
