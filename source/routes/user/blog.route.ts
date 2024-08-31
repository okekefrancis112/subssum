// Import express module
import express from 'express';

// Import controllers and validations
import * as blogControllers from '../../controllers/user/blog.controller';
import * as blogValidations from '../../validations/user/blog.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Blog

// GET route to get blog-categories
router.get(
  '/get-categories',
  auth.auth, // authentication middleware
  blogControllers.getBlogCategories // controller to handle the request
);

// GET route to get blog-tags
router.get(
  '/get-tags',
  auth.auth, // authentication middleware
  blogControllers.getBlogTags // controller to handle the request
);

// GET route to get blog by category
router.get(
  '/get-blog/:category_id',
  auth.auth, // authentication middleware
  blogValidations.validateCategoryId, // validation middleware
  blogControllers.getBlogsByCategory // controller to handle the request
);

// GET route to get blog by tags
router.get(
  '/get-by-tags',
  auth.auth, // authentication middleware
  blogControllers.getBlogsByTag // controller to handle the request
);

// GET route to get blogs
router.get(
  '/get-blogs',
  auth.auth, // authentication middleware
  blogControllers.getBlogs // controller to handle the request
);

// GET route to get blog by id
router.get(
  '/get/:blog_id',
  auth.auth, // authentication middleware
  blogValidations.validateBlogId, // validation middleware
  blogControllers.getBlog // controller to handle the request
);

// PUT route to like blog
router.put(
  '/like/:blog_id',
  auth.auth, // authentication middleware
  blogValidations.validateBlogId, // validation middleware
  blogControllers.likeBlog // controller to handle the request
);

// Export router
export default router;
