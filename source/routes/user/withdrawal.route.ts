// Import express module
import express from 'express';

// Import controllers and validations
import * as withdrawalControllers from '../../controllers/user/withdrawal.controller';
import * as WithdrawalValidations from '../../validations/user/withdrawal.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Withdrawal

// POST route to create a withdrawal request
router.post(
  '/request',
  auth.auth, // authentication middleware
  WithdrawalValidations.validateWithdrawal, // validation middleware
  withdrawalControllers.requestWithdrawal // controller to handle the request
);

// POST route to create a withdrawal request to a foreign bank
router.post(
  '/request/foreign',
  auth.auth, // authentication middleware
  WithdrawalValidations.validateWithdrawal, // validation middleware
  withdrawalControllers.requestWithdrawalForeignBank // controller to handle the request
);

// POST route to verify a withdrawal request
router.post(
  '/verify-request',
  auth.auth, // authentication middleware
  WithdrawalValidations.validateVerifyRequest, // validation middleware
  withdrawalControllers.verifyWithdrawalRequests // controller to handle the request
);

// POST route to verify a withdrawal request to a foreign bank
router.post(
  '/verify-request/foreign',
  auth.auth, // authentication middleware
  WithdrawalValidations.validateVerifyRequest, // validation middleware
  withdrawalControllers.verifyWithdrawalRequestsForeignBank // controller to handle the request
);

// Export router
export default router;
