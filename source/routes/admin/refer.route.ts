// Import express module
import express from 'express';

// Import controllers and validations
import * as ReferControllers from '../../controllers/admin/refer.controller';
import auth_admin from '../../middlewares/auth-admin.middleware';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import { validateReferralId } from '../../validations/admin/refer.validation';

// Create router instance
const router = express.Router();

// Routes for referrals (admin)

// GET route to get all referrals
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-referrals'), // permission middleware
  ReferControllers.getRefer // controller to handle the request
);

// GET route to get all referrals
router.get(
  '/get-referral',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-referrals'), // permission middleware
  ReferControllers.getReferrals // controller to handle the request
);

// GET route to get referred users
router.get(
  '/get/:refer_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-referrals'), // permission middleware
  validateReferralId, // validation middleware
  ReferControllers.getSingleReferral // controller to handle the request
);

// GET route to export all referrals
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-referrals'), // permission middleware
  ReferControllers.exportReferrals // controller to handle the request
);

// GET route to export referred users
router.get(
  '/export/:refer_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-referrals'), // permission middleware
  validateReferralId, // validation middleware
  ReferControllers.exportSingleReferral // controller to handle the request
);

// Export router
export default router;
