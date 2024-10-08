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

// GET route to get user wallet information
router.get(
    "/get-user-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("view-users"),
    UserValidations.validateUserId,
    UsersControllers.getUserWalletDetails
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

// GET route to export a user wallet
router.get(
    "/export-user-wallet/:user_id",
    auth_admin.authAdmin,
    accessAdminAuth("export-users"),
    UserValidations.validateUserId,
    UsersControllers.exportUserWalletDetails
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
