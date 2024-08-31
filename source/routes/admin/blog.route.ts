// Import express module
import express from 'express';

// Import controllers and validations
import * as blogControllers from '../../controllers/admin/blog.controller';
import * as adminValidations from '../../validations/admin/blog.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Blog (admin)

// GET route to get blog-categories
router.get(
  '/get-categories',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  blogControllers.getBlogCategories // controller to handle the request
);

// POST route to create Blog
router.post(
  '/create-blog',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateCreateBlog, // validation middleware
  blogControllers.createBlog // controller to handle the request
);

// GET route to get blogs
router.get(
  '/get-blogs',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  blogControllers.getBlogs // controller to handle the request
);

// GET route to get a blog
router.get(
  '/get-blogs/:category_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateCategoryId, // validation middleware
  blogControllers.getBlogsByCategory // controller to handle the request
);

// GET route to get a blog
router.get(
  '/get-blog/:blog_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateBlogId, // validation middleware
  blogControllers.getSingleBlog // controller to handle the request
);

// PUT route to publish blog
router.put(
  '/publish/:blog_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateBlogId, // validation middleware
  blogControllers.publishBlog // controller to handle the request
);

// PUT route to edit blog
router.put(
  '/edit/:blog_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateBlogId, // validation middleware
  blogControllers.editBlog // controller to handle the request
);

// PUT route to delete blog
router.delete(
  '/delete/:blog_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateBlogId, // validation middleware
  blogControllers.deleteBlog // controller to handle the request
);

// PUT route to delete blog comment
router.delete(
  '/delete-comment/:blog_id/:comment_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateBlogId, // validation middleware
  blogControllers.deleteBlogComment // controller to handle the request
);

// Export router
export default router;
