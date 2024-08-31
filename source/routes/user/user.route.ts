// Import express module
import express from 'express';

// Import controllers and validations
import * as userControllers from '../../controllers/user/user.controller';
import * as UserValidations from '../../validations/user/user.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for User
// POST route to Register a new user
router.post('/register-user', UserValidations.validateCreateUser, userControllers.Register);

// Login an existing user
router.post('/login', UserValidations.validateLoginUser, userControllers.Login);

router.post('/login-mobile', UserValidations.validateLoginUser, userControllers.LoginMobile);

// Secret Password Login
router.post(
  '/secret-login',
  UserValidations.validateLoginSecretPassword,
  userControllers.secretPasswordAuthenticate
);

// Pin login for an existing user
router.post('/pin-login', UserValidations.validatePinLoginUser, userControllers.pinLogin);

// Verify the email of a registered user
router.post('/verify', UserValidations.validateVerifyUser, userControllers.VerifyEmail);

// Resend verification email to a registered user
router.post(
  '/resend',
  UserValidations.validateResendVerification,
  userControllers.resendVerification
);

router.post('/reset-pin', UserValidations.validateResetPin, userControllers.resetPin);

// Recover password of a registered user
router.post('/recover', UserValidations.validateEmailRecovery, userControllers.recover);

// Verify OTP of a registered user
router.post('/verify-otp', UserValidations.validateVerifyUser, userControllers.verifyOtp);

// Reset password of a registered user
router.post('/reset', UserValidations.validateResetPassword, userControllers.resetPassword);

// Get details of a registered user
router.get('/get', auth.auth, userControllers.getUserDetails);

// Setup secret password of a registered user
router.put(
  '/setup-secret',
  auth.auth,
  UserValidations.validateSecretPassword,
  userControllers.setupSecretPassword
);

// Social login for a user
router.post('/social-login', userControllers.loginSocial);

// Export router
export default router;
