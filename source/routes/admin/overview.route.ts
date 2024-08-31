// Import express module
import express from 'express';

// Import controllers and validations
import * as overviewControllers from '../../controllers/admin/overview.controller';
import auth_admin from '../../middlewares/auth-admin.middleware';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import { validateOverviewChartQuery } from '../../validations/admin/overview.validation';

// Create router instance
const router = express.Router();

// Routes for Admin Overview

// GET route to get all users
router.get(
  '/users',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-overview'), // permission middleware
  overviewControllers.getRecentUsers // controller to handle the request
);

// GET route to get all investments
router.get(
  '/investments',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-overview'), // permission middleware
  overviewControllers.getRecentInvestment // controller to handle the request
);

// GET route to get all wallet transactions
router.get(
  '/wallets',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-overview'), // permission middleware
  overviewControllers.getRecentWallet // controller to handle the request
);

// GET route to get all overview cards
router.get(
  '/cards',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-overview'), // permission middleware
  overviewControllers.getOverviewCards // controller to handle the request
);

// GET route to get admin overview chart
router.get(
  '/chart',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-overview'), // permission middleware
  validateOverviewChartQuery, // validation middleware
  overviewControllers.getOverviewChart // controller to handle the request
);

// Export router
export default router;
