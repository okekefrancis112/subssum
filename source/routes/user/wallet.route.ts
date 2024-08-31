// Import express module
import express from "express";

// Import controllers and validations
import * as walletControllers from "../../controllers/user/wallet.controller";

import * as savingsControllers from "../../controllers/user/savings.controller";
import * as WalletValidations from "../../validations/user/wallet.validation";
import auth from "../../middlewares/auth.middleware";

const router = express.Router();

// POST route to fund a wallet
router.post(
    "/fund-wallet",
    auth.auth,
    WalletValidations.validateWallet,
    WalletValidations.validateFundWallet,
    walletControllers.fundWallet
);

router.post("/test-savings", savingsControllers.processSavings);

router.post("/test-customer", auth.auth, walletControllers.generateNGNWallet);

router.post("/test-gen", auth.auth, walletControllers.testGen);
router.post("/test-gen2", walletControllers.testGen2);

router.delete(
    "/delete-customer/:customer_id",
    walletControllers.deleteCustomer
);

// POST route to get wallet name
router.post(
    "/get-name",
    auth.auth,
    WalletValidations.validateWalletName,
    walletControllers.getWalletName
);

// POST route to transfer fund
router.post(
    "/wallet-transfer",
    auth.auth,
    WalletValidations.validateWallet,
    WalletValidations.validateWalletTransfer,
    walletControllers.walletTransfer
);

// POST route to verify transfer
router.post(
    "/verify-transfer",
    auth.auth,
    WalletValidations.validateVerifyWalletTransfer,
    walletControllers.verifyWalletTransfer
);

// PUT route to save beneficiary
router.put(
    "/save-beneficiary",
    auth.auth,
    WalletValidations.validateSaveBeneficiary,
    walletControllers.saveBeneficiary
);

// DELETE route to delete beneficiary
router.delete(
    "/delete-beneficiary/:account_number",
    auth.auth,
    WalletValidations.validateWalletAccountNumber,
    walletControllers.deleteBeneficiary
);

// router.get('/user-wallet/:user_id', auth.auth, walletControllers.getUserWallet);

// GET route to get user wallet
router.get("/user-wallet", auth.auth, walletControllers.getUserWallet);

// GET route to get beneficiary
router.get("/get-beneficiaries", auth.auth, walletControllers.getBeneficiaries);

export default router;
