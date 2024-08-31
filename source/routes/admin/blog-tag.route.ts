// Import express module
import express from 'express';

// Import controllers and validations
import * as tagControllers from '../../controllers/admin/blog-tag.controller';
import * as adminValidations from '../../validations/admin/blog-tag.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Blog (admin)

// POST route to create blog-tags
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateCreateTag, // validation middleware
  tagControllers.createBlogTag // controller to handle the request
);

// GET route to get blog-tags
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  tagControllers.getBlogTags // controller to handle the request
);

// GET route to get blog-tag
router.get(
  '/get/:tag_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  tagControllers.getBlogTag // controller to handle the request
);

// PUT route to edit blog tag
router.put(
  '/edit/:tag_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateTagId, // validation middleware
  tagControllers.editBlogTag // controller to handle the request
);

// DELETE route to delete a Blog atg
router.delete(
  '/delete/:tag_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-project'), // permission middleware
  adminValidations.validateTagId, // validation middleware
  tagControllers.deleteBlogTag // controller to handle the request
);

// Export router
export default router;
