import express from "express";

import * as portfolioControllers from "../../controllers/user/portfolio.controller";
import * as portfolioWalletControllers from "../../controllers/user/portfolio-wallet.controller";
import * as portfolioPayWalletControllers from "../../controllers/user/portfolio-pay.controller";
import * as investmentControllers from "../../controllers/user/investment.controller";
import * as PortfolioValidations from "../../validations/user/portfolio.validation";
import auth from "../../middlewares/auth.middleware";
import validateObjectId from "../../validations/user/validateObjectId";

const router = express.Router();

// POST route to create an investment portfolio wallet
router.post(
    "/investment/create-portfolio-wallet",
    auth.auth,
    PortfolioValidations.validateCreateInvestPortfolioWallet,
    portfolioWalletControllers.createInvestmentPortfolioWallet
);

// POST route to top up an existing investment portfolio wallet
router.post(
    "/investment/topup-portfolio-wallet/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    PortfolioValidations.validateTopUpInvestPortfolioWallet,
    portfolioWalletControllers.topUpInvestmentPortfolioWallet
);

// POST route to create an investment portfolio payment
router.post(
    "/investment/create-portfolio-payment",
    auth.auth,
    PortfolioValidations.validatePaymentGatewayInvestment,
    portfolioPayWalletControllers.createInvestmentPortfolioPayService
);

// POST route to top up an existing investment portfolio
router.post(
    "/investment/topup-portfolio/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    PortfolioValidations.validateTopUpInvestPortfolio,
    portfolioPayWalletControllers.topUpInvestmentPortfolioPayService
);

// GET route to get the user's investment portfolio
router.get(
    "/investment/portfolio/fixed",
    auth.auth,
    investmentControllers.getFixedPortfolio
);

// GET route to get the user's investment portfolio
router.get(
    "/investment/portfolio/overview",
    auth.auth,
    investmentControllers.myInvestPortFolioOverview
);

router.get(
    "/investment/fixed/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    investmentControllers.getFixedPortfolioInvestments
);

// GET route to get information about a specific investment portfolio
router.get(
    "/investment/:portfolio_id/information",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    investmentControllers.investmentInformation
);

// GET route to get details of a specific investment
router.get(
    "/investment/portfolio/:investment_id",
    auth.auth,
    validateObjectId.validateInvestObjectId,
    investmentControllers.specificInvestmentDetails
);

// GET route to get chart data for a specific investment portfolio
router.get(
    "/investment/portfolio/:portfolio_id/chart",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    investmentControllers.myInvestPortfolioDetailChart
);

// GET route to get transaction data for a specific investment portfolio
router.get(
    "/investment/portfolio/:portfolio_id/transactions",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    investmentControllers.myInvestPortfolioDetailTransactions
);

// PUT route to pause a specific investment portfolio
router.put(
    "/pause/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    portfolioControllers.pausePortfolio
);

// PUT route to resume a specific investment portfolio
router.put(
    "/resume/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    portfolioControllers.resumePortfolio
);

// PUT route to turn on reinvest for a specific investment
router.put(
    "/turn-on-reinvest/:investment_id",
    auth.auth,
    validateObjectId.validateInvestObjectId,
    portfolioControllers.turnOnReinvest
);

// PUT route to turn off reinvest for a specific investment
router.put(
    "/turn-off-reinvest/:investment_id",
    auth.auth,
    validateObjectId.validateInvestObjectId,
    portfolioControllers.turnOffReinvest
);

// PUT route to edit a specific investment portfolio
router.put(
    "/edit/:portfolio_id",
    auth.auth,
    validateObjectId.validatePortfolioObjectId,
    PortfolioValidations.validateEditPortfolio,
    portfolioControllers.editPortfolio
);

// Route to get exchange rate
router.get("/exchange-rate", portfolioControllers.exchangeRate);

// Route to get new exchange rate
router.get("/new-exchange-rate", portfolioControllers.newExchangeRate);

// Route to get new exchange rate (Mobile)
router.get("/exchange-rate-mobile", portfolioControllers.newExchangeRateMobile);

export default router;
