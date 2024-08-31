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

// Blacklist
import { BlacklistSchema } from "./blacklist.model";
import { IBlacklistDocument } from "../interfaces/blacklist.interface";

// Banks
import { BanksSchema } from "./banks.model";
import { IBanksDocument } from "../interfaces/banks.interface";

// Cards
import { CardsSchema } from "./cards.model";
import { ICardsDocument } from "../interfaces/cards.interface";

// Plan
import { PlanSchema } from "./plan.model";
import { IPlanDocument } from "../interfaces/plan.interface";

// Transaction
import { TransactionSchema } from "./transaction.model";
import { ITransactionDocument } from "../interfaces/transaction.interface";

// Transaction Ref
import { TransactionRefSchema } from "./transaction_ref.model";
import { ITransactionRefDocument } from "../interfaces/transaction_ref.interface";

// Webhook
import { WebhookSchema } from "./webhook.model";
import { IWebhookDocument } from "../interfaces/webhook.interface";

// Investment
import { InvestmentSchema } from "./investment.model";
import { IInvestmentDocument } from "../interfaces/investment.interface";

// Saving
import { SavingsSchema } from "./saving.model";
import { ISavingsDocument } from "../interfaces/saving.interface";

// Refer Wallet
import { ReferWalletSchema } from "./refer-wallet.model";
import { IReferWalletDocument } from "../interfaces/refer-wallet.interface";

// Audit
import { AuditSchema } from "./audit.model";
import { IAuditDocument } from "../interfaces/audit.interface";

// Notification
import { NotificationSchema } from "./notification.model";
import { INotificationDocument } from "../interfaces/notification.interface";

// Withdrawal Requests
import { WithdrawalRequestsSchema } from "./withdrawal-requests.model";
import { IWithdrawalRequestsDocument } from "../interfaces/withdrawal-requests.interface";

// Blog Comments
import { BlogCommentSchema } from "./blog-comment.model";
import { IBlogCommentDocument } from "../interfaces/blog-comment.interface";

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

// FAQ Category Model
import { FaqCategorySchema } from "./faq-category.model";
import { IFaqCategoryDocument } from "../interfaces/faq-category.interface";

// FAQ Model
import { FaqSchema } from "./faq.model";
import { IFaqDocument } from "../interfaces/faq.interface";

// Testimony Model
import { TestimonialSchema } from './testimonial.model';
import { ITestimonialDocument } from '../interfaces/testimonial.interface';

// Track Model
import { TrackSchema } from './track.model';
import { ITrackDocument } from '../interfaces/track.interface';

// Listings
import { ListingSchema } from "./listing.model";
import { IListingDocument } from "../interfaces/listing.interface";

// Learn Category Model
import { LearnCategorySchema } from "./learn-category.model";
import { ILearnCategoryDocument } from "../interfaces/learn-category.interface";

// Learn Model
import { LearnSchema } from "./learn.model";
import { ILearnDocument } from "../interfaces/learn.interface";

// Admin Notification Model
import { AdminNotificationSchema } from "./admin-notification.model";
import { IAdminNotificationDocument } from "../interfaces/admin-notification.interface";

// Exchange Rate Model
import { ExchangeRateSchema } from "./exchange-rate.model";
import { IExchangeRateDocument } from "../interfaces/exchange-rate.interface";

// Security Model
import { SecuritySchema } from "./security.model";
import { ISecurityDocument } from "../interfaces/security.interface";

// Personalize Message Model
import { PersonalizeMessageSchema } from "./personalize-message.model";
import { IPersonalizeMessageDocument } from "../interfaces/personalize-message.interface";
import { ISecondaryDocument } from "../interfaces/secondary.interface";
import { SecondarySchema } from "./secondary.model";

// Blog Category Model
import { BlogCategorySchema } from "./blog-category.model";
import { IBlogCategoryDocument } from "../interfaces/blog-category.interface";

// Blog Tag Model
import { BlogTagSchema } from "./blog-tag.model";
import { IBlogTagDocument } from "../interfaces/blog-tag.interface";

// Blog
import { BlogSchema } from "./blog.models";
import { IBlogDocument } from "../interfaces/blog.interface";

// Settlement Account Model
import { SettlementAccountSchema } from './settlement-account.model';
import { ISettlementAccountDocument } from '../interfaces/settlement-account.interface';

export const User = model<IUserDocument>("Users", UserSchema);
export const Wallet = model<IWalletsDocument>("Wallets", WalletSchema);
export const Otp = model<IOtpDocument>("Otps", OtpSchema);
export const Plan = model<IPlanDocument>("Plans", PlanSchema);
export const Transaction = model<ITransactionDocument>(
    "Transactions",
    TransactionSchema
);
export const Secondary = model<ISecondaryDocument>(
    "Secondary",
    SecondarySchema
);
export const TransactionRef = model<ITransactionRefDocument>(
    "TransactionRefs",
    TransactionRefSchema
);
export const Listing = model<IListingDocument>("Listings", ListingSchema);
export const Webhook = model<IWebhookDocument>("Webhook", WebhookSchema);
export const Investment = model<IInvestmentDocument>(
    "Investments",
    InvestmentSchema
);
export const Saving = model<ISavingsDocument>("Savings", SavingsSchema);
export const Banks = model<IBanksDocument>("Banks", BanksSchema);
export const Cards = model<ICardsDocument>("Cards", CardsSchema);
export const Audit = model<IAuditDocument>("Audits", AuditSchema);
export const ReferWallet = model<IReferWalletDocument>(
    "ReferWallet",
    ReferWalletSchema
);
export const Notification = model<INotificationDocument>(
    "Notifications",
    NotificationSchema
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
export const FaqCategory = model<IFaqCategoryDocument>(
    "FaqCategories",
    FaqCategorySchema
);
export const Faq = model<IFaqDocument>("Faq", FaqSchema);
export const Testimonial = model<ITestimonialDocument>(
    "Testimonial",
    TestimonialSchema
);
export const Track = model<ITrackDocument>("Track", TrackSchema);
export const LearnCategory = model<ILearnCategoryDocument>(
    "LearnCategories",
    LearnCategorySchema
);
export const Learn = model<ILearnDocument>("Learn", LearnSchema);
export const AdminNotification = model<IAdminNotificationDocument>(
    "AdminNotifications",
    AdminNotificationSchema
);
export const ExchangeRate = model<IExchangeRateDocument>(
    "ExchangeRates",
    ExchangeRateSchema
);
export const WithdrawalRequest = model<IWithdrawalRequestsDocument>(
    "WithdrawalRequests",
    WithdrawalRequestsSchema
);

export const Security = model<ISecurityDocument>('Security', SecuritySchema);
export const Blacklist = model<IBlacklistDocument>('Blacklist', BlacklistSchema);
export const PersonalizeMessage = model<IPersonalizeMessageDocument>('PersonalizeMessage', PersonalizeMessageSchema);
export const SettlementAccount = model<ISettlementAccountDocument>('SettlementAccount', SettlementAccountSchema);
export const BlogCategory = model<IBlogCategoryDocument>(
    "BlogCategories",
    BlogCategorySchema
);
export const BlogTag = model<IBlogTagDocument>(
    "BlogTags",
    BlogTagSchema
);
export const Blog = model<IBlogDocument>(
    "Blogs",
    BlogSchema
);
export const BlogComment = model<IBlogCommentDocument>(
    "BlogComments",
    BlogCommentSchema
);
