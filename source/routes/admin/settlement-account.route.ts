// Import express module
import express from "express";

// Import controllers and validations
import * as settlementAccountControllers from "../../controllers/admin/settlement-account.controller";
import * as settlementAccountValidations from "../../validations/admin/settlement-account.validation";
import accessAdminAuth from "../../middlewares/access-auth.middleware";
import auth_admin from "../../middlewares/auth-admin.middleware";

// Create router instance
const router = express.Router();

// Routes for Settlement Account

// POST route to create settlement account
router.post(
    "/create",
    auth_admin.authAdmin,
    accessAdminAuth("create-exchange-rate"),
    settlementAccountValidations.validateCreateSettlementAccount,
    settlementAccountControllers.createSettlementAccount
);

// GET route to get single settlement account
router.get(
    "/get/:account_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-exchange-rates"),
    settlementAccountValidations.validateSettlementAccountId,
    settlementAccountControllers.getSingleSettlementAccount
);

// GET route to get all settlement accounts
router.get(
    "/get",
    auth_admin.authAdmin,
    accessAdminAuth("view-exchange-rates"),
    settlementAccountControllers.getSettlementAccounts
);

// PUT route to edit settlement account
router.put(
    "/update/:account_id",
    auth_admin.authAdmin,
    accessAdminAuth("create-exchange-rate"),
    settlementAccountValidations.validateSettlementAccountId,
    settlementAccountControllers.updateSettlementAccount
);

// PUT route to create default settlement account
router.put(
    "/default/:account_id",
    auth_admin.authAdmin,
    accessAdminAuth("create-exchange-rate"),
    settlementAccountValidations.validateSettlementAccountId,
    settlementAccountControllers.setDefaultSettlementAccount
);

// DELETE route to delete settlement account
router.delete(
    "/delete/:account_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-exchange-rate"),
    settlementAccountValidations.validateSettlementAccountId,
    settlementAccountControllers.deleteSettlementAccount
);

// GET route to export settlement accounts
router.get(
    "/export",
    auth_admin.authAdmin,
    accessAdminAuth("view-exchange-rates"),
    settlementAccountControllers.exportSettlementAccount
);

// Export router
export default router;
