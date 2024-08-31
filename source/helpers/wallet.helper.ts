import { Types } from "mongoose";
import {
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionTo,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import { IAction } from "../interfaces/webhook.interface";
import transactionRepository from "../repositories/transaction.repository";
import transaction_refRepository from "../repositories/transaction_ref.repository";
import walletRepository from "../repositories/wallet.repository";
import webhookRepository from "../repositories/webhook.repository";
import userRepository from "../repositories/user.repository";
import { ICurrency } from "../interfaces/exchange-rate.interface";

interface IWalletCredit {
    user_id: Types.ObjectId;
    amount: number;
    transaction_hash: string;
    reference: string;
    data?: any;
    payment_gateway: IPaymentGateway;
    description: string;
    sender?: Types.ObjectId;
    recipient?: Types.ObjectId;
    note?: string;
    currency: ICurrency;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    ip_address?: string;
    webhook_id?: string;
    transaction_to: ITransactionTo;
    wallet_transaction_type: IWalletTransactionType;
}

// Credit Wallet
export const creditWallet = async ({
    data,
    session,
}: {
    data: IWalletCredit;
    session: any;
}) => {
    try {
        const {
            user_id,
            amount,
            transaction_hash,
            reference,
            payment_gateway,
            description,
            sender,
            recipient,
            note,
            currency,
            exchange_rate_value,
            exchange_rate_currency,
            ip_address,
            webhook_id,
            transaction_to,
            wallet_transaction_type,
        } = data;

        // Check if Wallet exist
        const wallet = await walletRepository.getByUserId({ user_id });
        if (!wallet) {
            return {
                success: false,
                message: `Wallet does not exist`,
            };
        }

        let updateBalance;

        if (payment_gateway !== IPaymentGateway.DIASPORA_TRANSFER) {
            updateBalance = await walletRepository.processWalletCreditUpdates({
                user_id,
                amount: Number(amount),
                balance: wallet?.balance,
                session,
            });
        }

        // Save Transaction Ref
        const transactionRef = await transaction_refRepository.create({
            amount,
            transaction_hash,
            user_id,
            session,
        });

        // Save Transaction
        const transaction = await transactionRepository.create({
            amount,
            transaction_hash,
            transaction_medium: ITransactionMedium.WALLET,
            keble_transaction_type: IKebleTransactionType.WALLET_FUNDING,
            user_id: new Types.ObjectId(user_id),
            transaction_ref: transactionRef[0]._id,
            wallet: {
                wallet_id: wallet._id,
                wallet_balance_before: wallet.balance,
                wallet_balance_after: Number(wallet.balance) + Number(amount),
            },
            payment_reference: reference,
            transaction_type: ITransactionType.CREDIT,
            payment_gateway,
            description,
            sender,
            recipient,
            note,
            currency,
            exchange_rate_value,
            exchange_rate_currency,
            ip_address,
            transaction_status:
                payment_gateway &&
                payment_gateway !== IPaymentGateway.DIASPORA_TRANSFER
                    ? ITransactionStatus.SUCCESSFUL
                    : ITransactionStatus.PENDING,
            meta_data: data ? data.data : null,
            session,
            transaction_to,
            wallet_transaction_type,
        });

        // Save Webhook
        const webhook = await webhookRepository.create({
            platform: payment_gateway,
            action: IAction.WEBHOOK_SAVED,
            webhook_id: String(webhook_id),
            data,
            session,
        });

        const update_user = await userRepository.atomicUpdate(
            user_id,
            { total_amount_funded: amount },
            session
        );

        return {
            success: true,
            message: `Wallet credited successfully`,
            data: {
                updateBalance,
                transactionRef,
                transaction,
                webhook,
                update_user,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
        };
    }
};

interface IWalletDebit {
    user_id: Types.ObjectId;
    amount: number;
    transaction_hash: string;
    reference: string;
    data?: any;
    payment_gateway: IPaymentGateway;
    description?: string;
    currency: ICurrency;
    exchange_rate_value?: number;
    exchange_rate_currency?: string;
    ip_address?: string;
    note?: string;
    transaction_to: ITransactionTo;
    transaction_type: ITransactionType;
    wallet_transaction_type: IWalletTransactionType;
}

// Debit Wallet
export const debitWallet = async ({
    data,
    session,
}: {
    data: IWalletDebit;
    session: any;
}) => {
    try {
        const {
            user_id,
            amount,
            transaction_hash,
            reference,
            payment_gateway,
            description,
            currency,
            exchange_rate_value,
            exchange_rate_currency,
            ip_address,
            note,
            transaction_to,
            transaction_type,
            wallet_transaction_type,
        } = data;

        // Check if Wallet exist
        const wallet = await walletRepository.getByUserId({ user_id });
        if (!wallet) {
            return {
                success: false,
                message: `Wallet does not exist`,
            };
        }

        if (Number(wallet.balance < amount)) {
            return {
                success: false,
                message: `Insufficient wallet funds`,
            };
        }
        const updateBalance = await walletRepository.processWalletDebitUpdates({
            user_id,
            amount: amount,
            balance: wallet?.balance,
            session,
        });

        // Save Transaction Ref
        const transactionRef = await transaction_refRepository.create({
            amount,
            transaction_hash,
            user_id,
            session,
        });

        // Save Transaction
        const transaction = await transactionRepository.create({
            amount: amount,
            transaction_hash,
            transaction_medium: ITransactionMedium.WALLET,
            keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
            user_id: new Types.ObjectId(user_id),
            transaction_ref: transactionRef[0]._id,
            payment_reference: reference,
            transaction_type:
                transaction_type &&
                transaction_type === ITransactionType.WITHDRAWAL
                    ? ITransactionType.WITHDRAWAL
                    : ITransactionType.DEBIT,
            payment_gateway,
            wallet: {
                wallet_id: wallet._id,
                wallet_balance_before: wallet.balance,
                wallet_balance_after: Number(wallet.balance) - Number(amount),
            },
            description: description || "No description",
            currency,
            note: note || null,
            exchange_rate_value: exchange_rate_value || 0,
            exchange_rate_currency: exchange_rate_currency
                ? exchange_rate_currency
                : "",
            ip_address: ip_address ? ip_address : "",
            transaction_status:
                transaction_type &&
                transaction_type !== ITransactionType.WITHDRAWAL
                    ? ITransactionStatus.SUCCESSFUL
                    : ITransactionStatus.PENDING,
            meta_data: data ? data.data : null,
            transaction_to: transaction_to,
            wallet_transaction_type: wallet_transaction_type,
            session,
        });

        return {
            success: true,
            message: `Wallet debited successfully`,
            data: { updateBalance, transactionRef, transaction },
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
        };
    }
};

interface IWalletDebitReferral {
    user_id: Types.ObjectId;
    amount: number;
    transaction_hash: string;
    reference: string;
    payment_gateway: IPaymentGateway;
    currency: ICurrency;
    description?: string;
    data?: any;
    transaction_type: ITransactionType;
}

// Debit Wallet
export const debitReferralWallet = async ({
    data,
    session,
}: {
    data: IWalletDebitReferral;
    session: any;
}) => {
    try {
        const {
            user_id,
            amount,
            transaction_hash,
            reference,
            payment_gateway,
            currency,
            description,
            transaction_type,
        } = data;

        // Check if Refer Wallet exist
        const wallet = await walletRepository.getReferByUserId({ user_id });
        if (!wallet) {
            return {
                success: false,
                message: `Wallet does not exist`,
            };
        }

        if (Number(wallet.balance < amount)) {
            return {
                success: false,
                message: `Insufficient wallet funds`,
            };
        }
        const updateBalance =
            await walletRepository.processReferWalletDebitUpdates({
                user_id,
                amount: amount,
                balance: wallet?.balance,
                session,
            });

        // Save Transaction Ref
        const transactionRef = await transaction_refRepository.create({
            amount,
            transaction_hash,
            user_id,
            session,
        });

        // Save Transaction
        const transaction = await transactionRepository.create({
            amount: amount,
            transaction_hash,
            transaction_medium: ITransactionMedium.WALLET,
            keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
            user_id: new Types.ObjectId(user_id),
            transaction_ref: transactionRef[0]._id,
            payment_reference: reference,
            transaction_type:
                transaction_type &&
                transaction_type === ITransactionType.WITHDRAWAL
                    ? ITransactionType.WITHDRAWAL
                    : ITransactionType.DEBIT,
            payment_gateway,
            wallet: {
                wallet_id: wallet._id,
                wallet_balance_before: wallet.balance,
                wallet_balance_after: Number(wallet.balance) - Number(amount),
            },
            description: description,
            currency,
            transaction_status: ITransactionStatus.SUCCESSFUL,
            meta_data: data ? data.data : null,
            transaction_to: ITransactionTo.REFERRAL_WALLET,
            session,
        });

        return {
            success: true,
            message: `Wallet debited successfully`,
            data: {
                updateBalance,
                transactionRef,
                transaction,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
        };
    }
};
