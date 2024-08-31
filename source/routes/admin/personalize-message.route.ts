// Import express module
import express from 'express';

// Import controllers and validations
import * as personalizeMessageControllers from '../../controllers/admin/personalize-message.controller';
import * as personalizeMessageValidations from '../../validations/admin/personalize-message.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Personalize message

// POST route to create personalize message
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  personalizeMessageValidations.validateCreatePersonalizeMessage, // validation middleware
  personalizeMessageControllers.createPersonalizeMessage // controller to handle the request
);

// GET route to get single personalize message
router.get(
  '/get/:message_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  personalizeMessageValidations.validatePersonalizeMessageId, // validation middleware
  personalizeMessageControllers.getSinglePersonalizeMessage // controller to handle the request
);

// GET route to get all personalize messages
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  personalizeMessageControllers.getPersonalizeMessages // controller to handle the request
);

// PUT route to edit personalize message
router.put(
  '/update/:message_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  personalizeMessageValidations.validatePersonalizeMessageId, // validation middleware
  personalizeMessageControllers.updatePersonalizeMessage // controller to handle the request
);

// PUT route to create default personalize message
router.put(
  '/default/:message_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-exchange-rate'), // permission middleware
  personalizeMessageValidations.validatePersonalizeMessageId, // validation middleware
  personalizeMessageControllers.setDefaultPersonalizeMessage // controller to handle the request
);

// DELETE route to delete personalize message
router.delete(
  '/delete/:message_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-exchange-rate'), // permission middleware
  personalizeMessageValidations.validatePersonalizeMessageId, // validation middleware
  personalizeMessageControllers.deletePersonalizeMessage // controller to handle the request
);

// GET route to export personalize messages
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-exchange-rates'), // permission middleware
  personalizeMessageControllers.exportPersonalizeMessage // controller to handle the request
);

// Export router
export default router;
