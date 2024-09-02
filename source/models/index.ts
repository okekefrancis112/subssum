import { model } from "mongoose";

// User
import { UserSchema } from "./user.model";
import { IUserDocument } from "../interfaces/user.interface";

// Wallet
import { WalletSchema } from "./wallet.model";
import { IWalletsDocument } from "../interfaces/wallet.interface";

// OTP
import { OtpSchema } from "./otp.model";
import { IOtpDocument } from "../interfaces/otp.interface";

// Banks
import { BanksSchema } from "./banks.model";
import { IBanksDocument } from "../interfaces/banks.interface";

// Cards
import { CardsSchema } from "./cards.model";
import { ICardsDocument } from "../interfaces/cards.interface";

// payment
import { PaymentSchema } from "./payment.model";
import { IPaymentDocument } from "../interfaces/payment.interface";

// Transaction
import { TransactionSchema } from "./transaction.model";
import { ITransactionDocument } from "../interfaces/transaction.interface";

// Transaction Ref
import { TransactionRefSchema } from "./transaction_ref.model";
import { ITransactionRefDocument } from "../interfaces/transaction_ref.interface";

// Webhook
import { WebhookSchema } from "./webhook.model";
import { IWebhookDocument } from "../interfaces/webhook.interface";

// Refer Wallet
import { ReferWalletSchema } from "./refer-wallet.model";
import { IReferWalletDocument } from "../interfaces/refer-wallet.interface";

// Audit
import { AuditSchema } from "./audit.model";
import { IAuditDocument } from "../interfaces/audit.interface";

// Withdrawal Requests
import { WithdrawalRequestsSchema } from "./withdrawal-requests.model";
import { IWithdrawalRequestsDocument } from "../interfaces/withdrawal-requests.interface";

/**************
 *
 *
 *
 * ADMIN MODELS
 */

// Permission
import { PermissionSchema } from "./permission.model";
import { IPermissionDocument } from "../interfaces/permission.interface";

// Roles
import { RoleSchema } from "./role.model";
import { IRoleDocument } from "../interfaces/role.interface";

// Admin
import { AdminUserchema } from "./admin-user.model";
import { IAdminUserDocument } from "../interfaces/admin-user.interface";

// Exchange Rate Model
import { ExchangeRateSchema } from "./exchange-rate.model";
import { IExchangeRateDocument } from "../interfaces/exchange-rate.interface";

export const User = model<IUserDocument>("Users", UserSchema);
export const Wallet = model<IWalletsDocument>("Wallets", WalletSchema);
export const Otp = model<IOtpDocument>("Otps", OtpSchema);
export const Payment = model<IPaymentDocument>("Payments", PaymentSchema);
export const Transaction = model<ITransactionDocument>(
    "Transactions",
    TransactionSchema
);
export const TransactionRef = model<ITransactionRefDocument>(
    "TransactionRefs",
    TransactionRefSchema
);
export const Webhook = model<IWebhookDocument>("Webhook", WebhookSchema);
export const Banks = model<IBanksDocument>("Banks", BanksSchema);
export const Cards = model<ICardsDocument>("Cards", CardsSchema);
export const Audit = model<IAuditDocument>("Audits", AuditSchema);
export const ReferWallet = model<IReferWalletDocument>(
    "ReferWallet",
    ReferWalletSchema
);
export const Permission = model<IPermissionDocument>(
    "Permissions",
    PermissionSchema
);
export const Role = model<IRoleDocument>("Roles", RoleSchema);
export const AdminUser = model<IAdminUserDocument>(
    "AdminUsers",
    AdminUserchema
);
export const ExchangeRate = model<IExchangeRateDocument>(
    "ExchangeRates",
    ExchangeRateSchema
);
export const WithdrawalRequest = model<IWithdrawalRequestsDocument>(
    "WithdrawalRequests",
    WithdrawalRequestsSchema
);
