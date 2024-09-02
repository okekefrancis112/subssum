import express from "express";

import * as paymentWalletControllers from "../../controllers/user/payment-wallet.controller";
import * as paymentPayWalletControllers from "../../controllers/user/payment-pay.controller";
import * as paymentValidations from "../../validations/user/payment.validation";
import auth from "../../middlewares/auth.middleware";
import validateObjectId from "../../validations/user/validateObjectId";

const router = express.Router();

// POST route to create an investment payment wallet
router.post(
    "/investment/create-payment-wallet",
    auth.auth,
    paymentValidations.validateCreateInvestpaymentWallet,
    paymentWalletControllers.createInvestmentpaymentWallet
);

// POST route to top up an existing investment payment wallet
router.post(
    "/investment/topup-payment-wallet/:payment_id",
    auth.auth,
    validateObjectId.validatepaymentObjectId,
    paymentValidations.validateTopUpInvestpaymentWallet,
    paymentWalletControllers.topUpInvestmentpaymentWallet
);

// POST route to create an investment payment payment
router.post(
    "/investment/create-payment-payment",
    auth.auth,
    paymentValidations.validatePaymentGatewayInvestment,
    paymentPayWalletControllers.createInvestmentpaymentPayService
);

// POST route to top up an existing investment payment
router.post(
    "/investment/topup-payment/:payment_id",
    auth.auth,
    validateObjectId.validatepaymentObjectId,
    paymentValidations.validateTopUpInvestpayment,
    paymentPayWalletControllers.topUpInvestmentpaymentPayService
);

export default router;
