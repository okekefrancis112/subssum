// Import express module
import express from 'express';

// Import controllers and validations
import * as testimonialControllers from '../../controllers/admin/testimonial.controller';
import * as testimonialValidations from '../../validations/admin/testimonial.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Testimonials

// POST route to create testimonial
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-testimonials'), // permission middleware
  testimonialValidations.validateCreateTestimonial, // validation middleware
  testimonialControllers.createTestimonial // controller to handle the request
);

// GET route to get all testimonials
router.get(
  '/get',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-testimonials'), // permission middleware
  testimonialControllers.getTestimonials // controller to handle the request
);

// GET route to get a testimonial
router.get(
  '/get/:testimonial_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-testimonials'), // permission middleware
  testimonialValidations.validateTestimonialId, // validation middleware
  testimonialControllers.getSingleTestimonial // controller to handle the request
);

// PUT route to edit testimonial
router.put(
  '/update/:testimonial_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-testimonials'), // permission middleware
  testimonialValidations.validateTestimonialId, // validation middleware
  testimonialControllers.updateTestimonial // controller to handle the request
);

// DELETE route to delete testimonial
router.delete(
  '/delete/:testimonial_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-testimonials'), // permission middleware
  testimonialValidations.validateTestimonialId, // validation middleware
  testimonialControllers.deleteTestimonial // controller to handle the request
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


  // GET route to get testimonialS (User)
router.get(
    '/get-testimonials',
    testimonialControllers.getTestimonialsLanding // controller to handle the request
  );

  // GET route to get a testimonial (User)
router.get(
  '/get-testimonials/:testimonial_id',
  testimonialValidations.validateTestimonialId, // validation middleware
  testimonialControllers.getSingleTestimonialLanding // controller to handle the request
);

// Export router
export default router;
