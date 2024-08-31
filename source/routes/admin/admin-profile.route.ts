// Import express module
import express from 'express';

// Import controllers and validations
import * as adminProfileControllers from '../../controllers/admin/admin-profile.controller';
import * as adminProfileValidations from '../../validations/admin/admin-profile.validation';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Admin-Profile

// GET route to get admin user profile
router.get(
  '/get-profile',
  auth_admin.authAdmin, // authentication middleware
  adminProfileControllers.getAdminProfile // controller to handle the request
);

// PUT route to create and edit admin user profile-image
router.put('/upload-photo',
  auth_admin.authAdmin, // authentication middleware
  adminProfileControllers.uploadProfileImage // controller to handle the request
 );

 // PUT route to edit admin user profile
router.put(
  '/edit-profile',
  auth_admin.authAdmin, // authentication middleware
  adminProfileControllers.editProfile // controller to handle the request
);

 // PUT route to edit admin user password
router.put(
  '/edit-password',
  auth_admin.authAdmin, // authentication middleware
  adminProfileValidations.validateResetPassword, // validation middleware
  adminProfileControllers.resetPassword // controller to handle the request
);

// Export router
export default router;
