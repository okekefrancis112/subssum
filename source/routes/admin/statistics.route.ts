// Import express module
import express from "express";

// Import controllers and validations
import * as StatisticsControllers from "../../controllers/admin/statistics.controller";
import auth_admin from "../../middlewares/auth-admin.middleware";
import accessAdminAuth from "../../middlewares/access-auth.middleware";
import {
    validateDiasporaQuery,
    validateGenderQuery,
    validateInvestmentCategoryQuery,
    validateKYCQuery,
    validatePaymentMethodQuery,
    validatePaymentStyleQuery,
    validateWhereHowQuery,
} from "../../validations/admin/statistics.validation";

// Create router instance
const router = express.Router();

// Routes for Statistics

// GET route to get all Statistics
router.get(
    "/get",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getStatistics
);

// GET route to get gender Statistics
router.get(
    "/gender",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateGenderQuery,
    StatisticsControllers.getGenderStatistic
);

// GET route to get diaspora Statistics
router.get(
    "/diaspora",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateDiasporaQuery,
    StatisticsControllers.getDiasporaStatistic
);

// GET route to get kyc Statistics
router.get(
    "/kyc",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateKYCQuery,
    StatisticsControllers.getKYCStatistic
);

// GET route to get gender chart
router.get(
    "/gender/chart",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateGenderQuery,
    StatisticsControllers.getGenderStatisticChart
);

// GET route to export gender Statistics
router.get(
    "/gender/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportGenderStatistics
);

// GET route to export diaspora Statistics
router.get(
    "/diaspora/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportDiasporaStatistics
);

// GET route to export kyc Statistics
router.get(
    "/kyc/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportKYCStatistics
);

// GET route to get age range Statistics
router.get(
    "/age-range",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getAgeRangeStatistics
);

// GET route to get age range chart
router.get(
    "/age-range/chart",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getAgeRangeStatisticChart
);

// GET route to export age range Statistics
router.get(
    "/age-range/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportAgeRangeStatistics
);

// GET route to get where how Statistics
router.get(
    "/where-how",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateWhereHowQuery,
    StatisticsControllers.getWhereHowStatistic
);

// GET route to get where how chart
router.get(
    "/where-how/chart",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateWhereHowQuery,
    StatisticsControllers.getWhereHowStatisticChart
);

// GET route to export where how Statistics
router.get(
    "/where-how/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportWhereHowStatistics
);

// GET route to get payment_style Statistics
router.get(
    "/payment-style",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validatePaymentStyleQuery,
    StatisticsControllers.getPaymentStyleStatistic
);

// GET route to get payment_style Statistics
router.get(
    "/investment-category",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validateInvestmentCategoryQuery,
    StatisticsControllers.getInvestmentCategoriesStatistic
);

// GET route to get payment_method Statistics
router.get(
    "/payment-method",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validatePaymentMethodQuery,
    StatisticsControllers.getPaymentMethodStatistic
);

// GET route to get refer and earn Statistics
router.get(
    "/refer",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getReferStatistic
);

// GET route to get fund wallet Statistics
router.get(
    "/fund-wallet",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getFundWalletStatistic
);

// GET route to get debit wallet Statistics
router.get(
    "/debit-wallet",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getDebitWalletStatistic
);

// GET route to get wallet payment method Statistics
router.get(
    "/wallet-payment-method",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    StatisticsControllers.getWalletPaymentMethodStatistic
);

// GET route to get payment style chart
router.get(
    "/payment-style/chart",
    auth_admin.authAdmin,
    accessAdminAuth("view-statistics"),
    validatePaymentStyleQuery,
    StatisticsControllers.getPaymentStyleStatisticChart
);

// GET route to export payment style Statistics
router.get(
    "/payment-style/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportPaymentStyleStatistics
);

// GET route to export payment method Statistics
router.get(
    "/payment-method/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportPaymentMethodStatistics
);

// GET route to export investment category Statistics
router.get(
    "/investment-category/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportInvestmentCategoryStatistics
);

// GET route to export refer Statistics
router.get(
    "/refer/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportReferStatistics
);

// GET route to export fund wallet Statistics
router.get(
    "/fund-wallet/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportFundWalletStatistics
);

// GET route to export fund wallet Statistics
router.get(
    "/debit-wallet/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportDebitWalletStatistics
);

// GET route to export wallet payment method Statistics
router.get(
    "/wallet-payment-method/export",
    auth_admin.authAdmin,
    accessAdminAuth("export-statistics"),
    StatisticsControllers.exportWalletPaymentMethodStatistics
);

// Export router
export default router;
