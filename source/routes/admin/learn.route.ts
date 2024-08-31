// Import express module
import express from 'express';

// Import controllers and validations
import * as learnControllers from '../../controllers/admin/learn.controller';
import * as learnValidations from '../../validations/admin/learn.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Learn

// POST route to create a learn
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-learns'), // permission middleware
  learnValidations.validateCreateLearn, // validation middleware
  learnControllers.createLearn // controller to handle the request
);

// GET route to get all learn categories
router.get('/categories', learnControllers.getLearnCategories);

// GET route to get learn video by category
router.get(
  '/get-learns/:category_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-learns'), // permission middleware
  learnValidations.validateCategoryId, // validation middleware
  learnControllers.getLearnsByCategory // controller to handle the request
);

// GET route to get a learn video
router.get(
  '/get/:learn_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-learns'), // permission middleware
  learnValidations.validateLearnId, // validation middleware
  learnControllers.getSingleLearn // controller to handle the request
);

// GET route to get all learn videos
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-learns'), // permission middleware
  learnControllers.getLearns // controller to handle the request
);

// PUT route to edit learn video
router.put(
  '/update/:learn_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-learns'), // permission middleware
  learnValidations.validateLearnId, // validation middleware
  learnControllers.updateLearn // controller to handle the request
);

// DELETE route to delete learn video
router.delete(
  '/delete/:learn_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-learns'), // permission middleware
  learnValidations.validateLearnId, // validation middleware
  learnControllers.deleteLearn // controller to handle the request
);

// GET route to export learn videos
router.get(
  '/export',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-learns'), // permission middleware
  learnControllers.exportLearn // controller to handle the request
);


/***********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * ********************** LANDING PAGE *********************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 */

// GET route to get learn videos (user)
router.get('/get-learns', learnControllers.getLearnsLanding);

// GET route to get learn videos by categories (user)
router.get('/get-categories', learnControllers.getLearnCategories);

// GET route to get learn videos (user)
router.get(
  '/get-by-category/:category_id',
  learnValidations.validateCategoryId, // validation middleware
  learnControllers.getLearnsByCategoryLandingPage // controller to handle the request
);

// GET route to get default learn video (user)
router.get(
  '/get-default',
  learnControllers.getDefaultLearn // controller to handle the request
);

// Export router
export default router;
