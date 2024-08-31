// Import express module
import express from 'express';

// Import controllers and validations
import * as faqControllers from '../../controllers/admin/faq.controller';
import * as faqValidations from '../../validations/admin/faq.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for FAQ

// POST route to create FAQ
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-faqs'), // permission middleware
  faqValidations.validateCreateFaq, // validation middleware
  faqControllers.createFaq // controller to handle the request
);

// GET route to get FAQ categories
router.get('/categories', faqControllers.getFaqCategories);

// GET route to get FAQ by category
router.get(
  '/get-faqs/:category_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-faqs'), // permission middleware
  faqValidations.validateCategoryId, // validation middleware
  faqControllers.getFaqsByCategory // controller to handle the request
);

// GET route to get a single FAQ
router.get(
  '/get/:faq_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-faqs'), // permission middleware
  faqValidations.validateFaqId, // validation middleware
  faqControllers.getSingleFaq // controller to handle the request
);

// GET route to get all FAQs
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-faqs'), // permission middleware
  faqControllers.getFaqs // controller to handle the request
);

// PUT route to edit FAQ
router.put(
  '/update/:faq_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-faqs'), // permission middleware
  faqValidations.validateFaqId, // validation middleware
  faqControllers.updateFaq // controller to handle the request
);

// DELETE route to delete FAQ
router.delete(
  '/delete/:faq_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-faqs'), // permission middleware
  faqValidations.validateFaqId, // validation middleware
  faqControllers.deleteFaq // controller to handle the request
);

// Export router
export default router;
