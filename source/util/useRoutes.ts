import { Express } from "express";

import user from "../routes/user/user.route";
import bank from "../routes/user/banks.route";
import wallet from "../routes/user/wallet.route";
import plan from "../routes/user/portfolio.route";
import referral from "../routes/user/referral.route";
import profile from "../routes/user/profile.route";
import statics from "../routes/user/statics.route";
import listings from "../routes/user/listings.route";
import card from "../routes/user/cards.route";
import notification from "../routes/user/notification.route";
import withdrawal from "../routes/user/withdrawal.route";
import secondary from "../routes/user/secondary.route";
import blog from "../routes/user/blog.route";
import comment from "../routes/user/blog-comment.route";

// Home
import home from "../routes/home/stats.route";

// Webhook
import webhook from "../routes/webhook/webhook.route";

// Admin
import authAdmin from "../routes/admin/admin-user.route";
import faqAdmin from "../routes/admin/faq.route";
import auditAdmin from "../routes/admin/audit.route";
import testimonialAdmin from "../routes/admin/admin-testimonial.route";
import role from "../routes/admin/role.route";
import users from "../routes/admin/users.route";
import userTracks from "../routes/admin/track.route";
import admin_referrals from "../routes/admin/refer.route";
import adminProfile from "../routes/admin/admin-profile.route";
import statistics from "../routes/admin/statistics.route";
import investment from "../routes/admin/investment.route";
import overview from "../routes/admin/overview.route";
import adminListing from "../routes/admin/admin-listing.route";
import learnAdmin from "../routes/admin/learn.route";
import notificationAdmin from "../routes/admin/admin-notification.route";
import walletAdmin from "../routes/admin/wallet.route";
import exchangeRateAdmin from "../routes/admin/exchange-rate.route";
import personalizeMessageAdmin from "../routes/admin/personalize-message.route";
import security from "../routes/admin/security.route";
import blogAdmin from "../routes/admin/blog.route";
import blogTag from "../routes/admin/blog-tag.route";
import settlementAccountAdmin from "../routes/admin/settlement-account.route";

export const bindUserRoutes = (app: Express): void => {
    app.use("/api/v3/user", user);
    app.use("/api/v3/bank", bank);
    app.use("/api/v3/card", card);
    app.use("/api/v3/wallet", wallet);
    app.use("/api/v3/webhook", webhook);
    app.use("/api/v3/plan", plan);
    app.use("/api/v3/referral", referral);
    app.use("/api/v3/profile", profile);
    app.use("/api/v3/statics", statics);
    app.use("/api/v3/track", userTracks);
    app.use("/api/v3/testimonial", testimonialAdmin);
    app.use("/api/v3/listings", listings);
    app.use("/api/v3/learn", learnAdmin);
    app.use("/api/v3/notification", notification);
    app.use("/api/v3/withdrawal", withdrawal);
    app.use("/api/v3/home", home);
    app.use("/api/v3/secondary", secondary);
    app.use("/api/v3/blog", blog);
    app.use("/api/v3/comment", comment);
};

export const bindAdminRoutes = (app: Express): void => {
    app.use("/api/v3/admin/auth", authAdmin);
    app.use("/api/v3/admin/faq", faqAdmin);
    app.use("/api/v3/admin/audit", auditAdmin);
    app.use("/api/v3/admin/testimonial", testimonialAdmin);
    app.use("/api/v3/admin/role", role);
    app.use("/api/v3/admin/users", users);
    app.use("/api/v3/admin/track", userTracks);
    app.use("/api/v3/admin/referral", admin_referrals);
    app.use("/api/v3/admin/profile", adminProfile);
    app.use("/api/v3/admin/statistics", statistics);
    app.use("/api/v3/admin/investment", investment);
    app.use("/api/v3/admin/overview", overview);
    app.use("/api/v3/admin/listing", adminListing);
    app.use("/api/v3/admin/learn", learnAdmin);
    app.use("/api/v3/admin/notification", notificationAdmin);
    app.use("/api/v3/admin/wallet", walletAdmin);
    app.use("/api/v3/admin/exchange-rate", exchangeRateAdmin);
    app.use("/api/v3/admin/security", security);
    app.use("/api/v3/admin/personalize-message", personalizeMessageAdmin);
    app.use("/api/v3/admin/tag", blogTag);
    app.use("/api/v3/admin/blog", blogAdmin);
    app.use("/api/v3/admin/settlement-account", settlementAccountAdmin);
};
