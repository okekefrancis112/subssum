// Import express module
import express from "express";

// Import controllers and validations
import * as UsersControllers from "../../controllers/admin/users.controller";
import * as UserValidations from "../../validations/admin/users.validation";
import auth_admin from "../../middlewares/auth-admin.middleware";
import accessAdminAuth from "../../middlewares/access-auth.middleware";

// Create router instance
const router = express.Router();

// Routes for Users

// PUT route to blacklist a user
router.put(
    "/blacklist-user/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateUserId,
    UserValidations.validateBlackList,
    UsersControllers.blackListUser
);

// PUT route to whitelist a user
router.put(
    "/whitelist-user/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateUserId,
    UsersControllers.whiteListUser
);

// PUT route to blacklist users
router.put(
    "/blacklist-users",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateBlackList,
    UsersControllers.blackListMultipleUsers
);

// PUT route to whitelist users
router.put(
    "/whitelist-users",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UsersControllers.whiteListMultipleUsers
);

// PUT route to edit a user
router.put(
    "/edit-user/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateUserId,
    UsersControllers.editUser
);

// GET route to get all users
router.get(
    "/get-all",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UsersControllers.getUsers
);

// GET route to get all blacklisted users
router.get(
    "/get-all-blacklisted",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UsersControllers.getBlacklistedUsers
);

// GET route to get all blacklisted users
router.get(
    "/get-blacklisted-user/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getSingleBlacklistedUsers
);

// GET route to get all blacklisted users
router.get(
    "/get-blacklisted-history/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getBlacklistedHistory
);

// GET route to export all blacklisted users
router.get(
    "/export-all-blacklisted",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UsersControllers.exportBlacklistedUsers
);

// GET route to export all blacklisted users
router.get(
    "/export-blacklisted/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.exportBlacklistedUserHistory
);

// GET route to get a user personal info
router.get(
    "/get-personal-info/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserPersonalInfo
);

// GET route to get a user next of kin
router.get(
    "/get-nok-info/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserNextOfKinInfo
);

// GET route to get a user plan
router.get(
    "/get-user-plans/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserPlans
);

// GET route to get user wallet information
router.get(
    "/get-user-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserWalletDetails
);

// GET route to get a user plan investment details
router.get(
    "/get-user-plan-investments-details/:user_id/:plan_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UserValidations.validatePlanId,
    UsersControllers.getUserPlanInvestmentsDetails
);

// DELETE route to delete a user
router.delete(
    "/delete/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateUserId,
    UsersControllers.deleteUser
);

// ! PERMANENT DELETE route to delete a user
router.delete(
    "/hard-delete/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-users"),
    UserValidations.validateUserId,
    UsersControllers.hardDeleteUser
);

// GET route to export all users
router.get(
    "/export-all",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UsersControllers.exportUsers
);

// GET route to export user plan details
router.get(
    "/export-user-plans/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("export-users"),
    UserValidations.validateUserId,
    UsersControllers.exportUserPlans
);

// GET route to export a user wallet
router.get(
    "/export-user-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("export-users"),
    UserValidations.validateUserId,
    UsersControllers.exportUserWalletDetails
);

// GET route to export a user investment details
router.get(
    "/export-user-plan-investments-details/:user_id/:plan_id",
    auth_admin.authAdmin,
    accessAdminAuth("export-users"),
    UserValidations.validateUserId,
    UserValidations.validatePlanId,
    UsersControllers.exportUserPlanInvestmentsDetails
);

router.get(
    "/get-wallet/:user_id/transactions/",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserWalletTransactions
);

// Export router
export default router;
