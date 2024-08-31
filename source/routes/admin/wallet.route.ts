// Import express module
import express from "express";

// Import controllers and validations
import * as WalletControllers from "../../controllers/admin/wallet.controller";
import auth_admin from "../../middlewares/auth-admin.middleware";
import accessAdminAuth from "../../middlewares/access-auth.middleware";
import {
    validateWalletChart,
    validateWalletRequest,
} from "../../validations/admin/wallet.validation";
import { validateUserId } from "../../validations/admin/users.validation";

// Create router instance
const router = express.Router();

router.get(
    "/chart",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    validateWalletChart,
    WalletControllers.getWalletChart
);

// GET route to get wallet cards
router.get(
    "/cards",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getWalletCards
);

// GET route to get wallet transactions
router.get(
    "/balance",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getWalletBalance
);

// GET route to get wallet funding transactions
router.get(
    "/saving",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getWalletSavings
);

// GET route to get wallet transfer transactions
router.get(
    "/transaction",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getWalletTransactions
);

// GET route to get wallet requests transactions
router.get(
    "/requests",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getWalletRequestTransactions
);

// GET route to get a single user wallet
router.get(
    "/user/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    validateUserId,
    WalletControllers.getUserWalletById
);

// POST route to fund user wallet
router.post(
    "/fund-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    WalletControllers.fundUserWallet
);

// POST route to debit user wallet
router.post(
    "/debit-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    WalletControllers.debitUserWallet
);

// GET route to get a single user wallet transaction
router.get(
    "/withdrawal/:transaction_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-wallet"),
    WalletControllers.getSingleWithdrawal
);

// GET route to export wallet transactions
router.get(
    "/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-wallet"),
    WalletControllers.exportWalletTransactions
);

// GET route to export wallet balances
router.get(
    "/export-balance",
    auth_admin.authAdmin,
    accessAdminAuth("export-wallet"),
    WalletControllers.exportWalletBalance
);

// GET route to export wallet saving
router.get(
    "/export-saving",
    auth_admin.authAdmin,
    accessAdminAuth("export-wallet"),
    WalletControllers.exportWalletSaving
);

// GET route to export wallet transaction
router.get(
    "/export-transaction",
    auth_admin.authAdmin,
    accessAdminAuth("export-wallet"),
    WalletControllers.exportWalletTransaction
);

// GET route to export wallet transaction
router.get(
    "/export-request",
    auth_admin.authAdmin,
    accessAdminAuth("export-wallet"),
    WalletControllers.exportWalletRequest
);

// GET route to export wallet balances
router.put(
    "/edit-status/:transaction_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-wallet"),
    validateWalletRequest,
    WalletControllers.updateRequestStatus
);

// Export router
export default router;
