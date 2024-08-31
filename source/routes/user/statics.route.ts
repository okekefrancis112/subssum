// Import express module
import express from 'express';

// Import controllers and validations
import * as faqControllers from '../../controllers/admin/faq.controller';
import * as FaqValidation from '../../validations/admin/faq.validation';

// Create router instance
const router = express.Router();

// Routes for Faq
// POST route to create a faq
router.get('/faq/get', faqControllers.getFaqsLanding);

// GET route to get all faq categories
router.get('/faq/get-categories', faqControllers.getFaqCategories);

// GET route to get faq by category
router.get(
  '/faq/get-by-category/:category_id',
  FaqValidation.validateCategoryId,
  faqControllers.getFaqsByCategoryLandingPage
);

// Export router
export default router;
