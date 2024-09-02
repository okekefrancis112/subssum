import { Express } from "express";

import user from "../routes/user/user.route";
import bank from "../routes/user/banks.route";
import wallet from "../routes/user/wallet.route";
import payment from "../routes/user/payment.route";
import referral from "../routes/user/referral.route";
import profile from "../routes/user/profile.route";
import card from "../routes/user/cards.route";
import withdrawal from "../routes/user/withdrawal.route";

// Webhook
import webhook from "../routes/webhook/webhook.route";

// Admin
import authAdmin from "../routes/admin/admin-user.route";
import role from "../routes/admin/role.route";
import users from "../routes/admin/users.route";
import admin_referrals from "../routes/admin/refer.route";
import adminProfile from "../routes/admin/admin-profile.route";
import walletAdmin from "../routes/admin/wallet.route";
import exchangeRateAdmin from "../routes/admin/exchange-rate.route";

export const bindUserRoutes = (app: Express): void => {
    app.use("/api/v3/user", user);
    app.use("/api/v3/bank", bank);
    app.use("/api/v3/card", card);
    app.use("/api/v3/wallet", wallet);
    app.use("/api/v3/webhook", webhook);
    app.use("/api/v3/payment", payment);
    app.use("/api/v3/referral", referral);
    app.use("/api/v3/profile", profile);
    app.use("/api/v3/withdrawal", withdrawal);
};

export const bindAdminRoutes = (app: Express): void => {
    app.use("/api/v3/admin/auth", authAdmin);
    app.use("/api/v3/admin/role", role);
    app.use("/api/v3/admin/users", users);
    app.use("/api/v3/admin/referral", admin_referrals);
    app.use("/api/v3/admin/profile", adminProfile);
    app.use("/api/v3/admin/wallet", walletAdmin);
    app.use("/api/v3/admin/exchange-rate", exchangeRateAdmin);
};
