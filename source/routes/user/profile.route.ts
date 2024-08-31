// Import express module
import express from 'express';

// Import controllers and validations
import * as profileControllers from '../../controllers/user/profile.controller';
import * as ProfileValidations from '../../validations/user/profile.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Profile

// PUT route to create / update user profile image
router.put('/upload-photo', auth.auth, profileControllers.uploadProfileImage);

// GET route to get user profile information
router.get('/get', auth.auth, profileControllers.getUserProfile);

// PUT route to edit user profile information
router.put(
  '/edit',
  auth.auth,
  // ProfileValidations.validateUserProfile, // validation middleware
  profileControllers.editProfile
);

// PUT route to reset user password
router.put(
  '/reset-password',
  auth.auth, // authentication middleware
  ProfileValidations.validateResetPassword, // validation middleware
  profileControllers.resetPassword // controller to handle the request
);

// PUT route to edit user next of kin information
router.put(
  '/nok',
  auth.auth, // authentication middleware
  ProfileValidations.validateNextOfKin, // validation middleware
  profileControllers.addNextOfKin // controller to handle the request
);

// PUT route to toggle user pin
router.put(
  '/toggle-pin',
  auth.auth,
  ProfileValidations.validateToggleUserPin,
  profileControllers.toggleUserPin
);

// PUT route to set user pin
router.put('/set-pin', auth.auth, ProfileValidations.validateSetPin, profileControllers.setUserPin);

// PUT route to change user pin
router.put(
  '/change-pin',
  auth.auth, // authentication middleware
  ProfileValidations.validateChangePin, // validation middleware
  profileControllers.changeUserPin // controller to handle the request
);

// PUT route to set user secret password
router.put(
  '/set-secret',
  auth.auth, // authentication middleware
  ProfileValidations.validateSetSecretPassword, // validation middleware
  profileControllers.setSecretPassword // controller to handle the request
);

// PUT route to edit user secret password
router.put(
  '/change-secret',
  auth.auth, // authentication middleware
  ProfileValidations.validateChangeSecretPassword, // validation middleware
  profileControllers.changeSecretPassword // controller to handle the request
);

// POST route to verify user identity
router.post('/verify-identity', auth.auth, profileControllers.verifyIdentity);

router.put('/initiate-delete', auth.auth, profileControllers.initiateDeleteAccount);

router.put('/delete-account', auth.auth, profileControllers.softDeleteAccount);

// Export router
export default router;
