// Import express module
import express from 'express';

// Import controllers and validations
import * as commentControllers from '../../controllers/user/blog-comment.controller';
import * as commentValidations from '../../validations/user/blog-comment.validation';
import auth from '../../middlewares/auth.middleware';

// Create router instance
const router = express.Router();

// Routes for Blog Comments

// POST route to create blog comment
router.post(
  '/create/:blog_id',
  auth.auth, // authentication middleware
  commentValidations.validateCreateComment, // validation middleware
  commentControllers.createBlogComment // controller to handle the request
);

// PUT route to edit blog comment
router.put(
  '/edit/:comment_id',
  auth.auth, // authentication middleware
  commentValidations.validateCommentId, // validation middleware
  commentControllers.editBlogComment // controller to handle the request
);

// GET route to get blog comments
router.get(
  '/get/:blog_id',
  auth.auth, // authentication middleware
  commentValidations.validateBlogId, // validation middleware
  commentControllers.getBlogComments // controller to handle the request
);

// GET route to get blog comment
router.get(
  '/get-comment/:comment_id',
  auth.auth, // authentication middleware
  commentValidations.validateCommentId, // validation middleware
  commentControllers.getSingleBlogComment // controller to handle the request
);

// DELETE route to delete blog comment
router.delete(
  '/delete/:comment_id',
  auth.auth, // authentication middleware
  commentValidations.validateCommentId, // validation middleware
  commentControllers.deleteBlogComment // controller to handle the request
);

// Export router
export default router;
