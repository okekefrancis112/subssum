// Import express module
import express from 'express';

// Import controllers and validations
import * as secondaryControllers from '../../controllers/admin/secondary.controller';
import * as InvestmentValidations from '../../validations/admin/investment.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';
import { validatePlanId, validateUserId } from '../../validations/admin/users.validation';
import { validateListingId } from '../../validations/admin/listing.validation';

// Create router instance
const router = express.Router();

// Routes for Secondary Investment

// GET route to get all secondary-investments
router.get(
    '/',
    auth_admin.authAdmin, // authentication middleware
    accessAdminAuth('view-portfolio'), // permission middleware
    secondaryControllers.getSecondaryMarkets // controller to handle the request
  );

// GET route to get single secondary-investment
router.get(
  '/get/:secondary_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-portfolio'), // permission middleware
  secondaryControllers.getSingleSecondaryMarket // controller to handle the request
);

// GET route to get all secondary-investments
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-portfolio'), // permission middleware
  secondaryControllers.exportSecondaryMarkets // controller to handle the request
);

// Put route to update secondary-investment
router.put(
  '/edit/:transaction_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-portfolio'), // permission middleware
  secondaryControllers.updateSecondaryStatus // controller to handle the request
);

// Export router
export default router;