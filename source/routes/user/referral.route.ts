// Import express module
import express from 'express';

// Import controllers and validations
import * as referralControllers from '../../controllers/user/referral.controller';
import auth from '../../middlewares/auth.middleware';
import { validateSendToReferWallet } from '../../validations/user/wallet.validation';

// Create router instance
const router = express.Router();

// Routes for Referral

// GET route to get all referrals
router.get('/get', auth.auth, referralControllers.referralPage);

router.get('/get-referrals', auth.auth, referralControllers.referralsPage);

// POST route to send referral bonus to wallet
router.post(
  '/send-to-wallet',
  auth.auth, // authentication middleware
  validateSendToReferWallet, // validation middleware
  referralControllers.sendToWallet // controller to handle the request
);

// GET route to get referral chart
router.get('/get/chart', auth.auth, referralControllers.referralChart);

// Export router
export default router;
