// Import express module
import express from 'express';

// Import controllers and validations
import * as investmentControllers from '../../controllers/admin/investment.controller';
import * as InvestmentValidations from '../../validations/admin/investment.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';
import { validatePlanId, validateUserId } from '../../validations/admin/users.validation';
import { validateListingId } from '../../validations/admin/listing.validation';

// Create router instance
const router = express.Router();

// Routes for Investment

// GET route to get all investments
router.get(
  '/',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-portfolio'), // permission middleware
  investmentControllers.getAllInvestments // controller to handle the request
);

// GET route to get all auto-investments
router.get(
  '/auto',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-portfolio'), // permission middleware
  investmentControllers.getAllAutoInvestments // controller to handle the request
);

// POST route to create user investment plan
router.post(
  '/create-plan/:user_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-portfolio'), // permission middleware
  validateUserId, // validation middleware
  investmentControllers.createPlanAdmin // controller to handle the request
);

// POST route to create user investment plan by selected listings
router.post(
  '/create-plan/:listing_id/:user_id/:plan_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-portfolio'), // permission middleware
  validateListingId, // validation middleware
  validateUserId, // validation middleware
  validatePlanId, // validation middleware
  investmentControllers.createPlanAdminBySelectedListing // controller to handle the request
);

// POST route to top-up user investment plan
router.post(
  '/top-up/:user_id/:plan_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-portfolio'), // permission middleware
  validateUserId, // validation middleware
  validatePlanId, // validation middleware
  investmentControllers.topUpInvestment // controller to handle the request
);

router.post(
  '/remove/:investment_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-portfolio'), // permission middleware
  InvestmentValidations.validateInvestmentId,
  investmentControllers.removeUserInvestment // controller to handle the request
);

// GET route to export user investments
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-portfolio'), // permission middleware
  InvestmentValidations.validateInvestmentQuery, // validation middleware
  investmentControllers.exportInvestment // controller to handle the request
);

// GET route to export user investments
router.get(
  '/export-auto',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-portfolio'), // permission middleware
  investmentControllers.exportAutoInvestment // controller to handle the request
);

// GET route to get listings based on holding period
router.get(
  '/get-plan-listing/:user_id/:plan_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-portfolio'), // permission middleware
  validateUserId, // validation middleware
  validatePlanId, // validation middleware
  investmentControllers.getListingByOnHoldingPeriod // controller to handle the request
);

// Export router
export default router;
