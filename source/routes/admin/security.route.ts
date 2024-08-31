// Import express module
import express from 'express';

// Import controllers and validations
import * as SecurityControllers from '../../controllers/admin/security.controller';
import auth_admin from '../../middlewares/auth-admin.middleware';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import { validateSecurityType } from '../../validations/admin/security.validation';

// Create router instance
const router = express.Router();

// Routes for Security

// POST route to create security pin
router.post(
  '/create-security',
  auth_admin.authAdmin, // authentication middleware
  // accessAdminAuth('view-referrals'),
  validateSecurityType, // validation middleware
  SecurityControllers.createSecurity // controller to handle the request
);

// GET route to get security pin
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  // accessAdminAuth('view-referrals'), // permission middleware
  SecurityControllers.getAllSecurity // controller to handle the request
);

// Export router
export default router;
