// Import express module
import express from 'express';

// Import controllers and validations
import * as listingControllers from '../../controllers/admin/admin-listing.controller';
import * as adminValidations from '../../validations/admin/listing.validation';
import accessAdminAuth from '../../middlewares/access-auth.middleware';
import auth_admin from '../../middlewares/auth-admin.middleware';

// Create router instance
const router = express.Router();

// Routes for Listing (admin)

// POST route to create listing
router.post(
  '/create',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateCreateListing, // validation middleware
  listingControllers.createListing // controller to handle the request
);

// POST route to create listing
router.post(
  '/create-new',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateCreateNewListing, // validation middleware
  listingControllers.createNewListing // controller to handle the request
);

// createRecurringListing

// POST route to create listing
router.post(
  '/create-recurring',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateCreateNewListing, // validation middleware
  listingControllers.createRecurringListing // controller to handle the request
);

// GET route to get listings
router.get(
  '/get-listings',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  listingControllers.getListings // controller to handle the request
);

// GET route to get a listing
router.get(
  '/get-listing-about/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getSingleListingAbout // controller to handle the request
);

// GET route to get listings
router.get(
  '/get-listing-fixed/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getListingFixedTransaction // controller to handle the request
);

// GET route to get listings
router.get(
  '/get-listing-flexible/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getListingFlexibleTransaction // controller to handle the request
);

// GET route to get listings
router.get(
  '/get-listing-cards/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getListingTransactionCards // controller to handle the request
);

// PUT route to edit listing
router.put(
  '/edit-listing/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.editListing // controller to handle the request
);

// PUT route to edit new listing
router.put(
  '/edit-new-listing/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.editNewListing // controller to handle the request
);

// DELETE route to delete listing
router.delete(
  '/delete-listing/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.deleteListing // controller to handle the request
);

// POST route to create listing activity
router.post(
  '/create/listing-activity/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.createListingActivities // controller to handle the request
);

// PUT route to edit listing activity
router.put(
  '/edit-listing-activities/:listing_id/:activity_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('create-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.editListingActivities // controller to handle the request
);

// GET route to get a listing activity
router.get(
  '/get-listing-activities/:listing_id/:activity_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getSingleListingActivities // controller to handle the request
);

// GET route to get listing activities
router.get(
  '/get-listing-activities/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('view-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.getSingleListingActivities // controller to handle the request
);

// DELETE route to delete a Listing activity
router.delete(
  '/delete-listing-activities/:listing_id/:activity_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('delete-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.deleteListingActivity // controller to handle the request
);

// GET route to export listing transactions
router.get(
  '/export-listing-fixed/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.exportListingFixedTransactions // controller to handle the request
);

// GET route to export listing transactions
router.get(
  '/export-listing-flexible/:listing_id',
  auth_admin.authAdmin, // authentication middleware
  accessAdminAuth('export-project'), // permission middleware
  adminValidations.validateListingId, // validation middleware
  listingControllers.exportListingFlexibleTransactions // controller to handle the request
);

// GET route to get listings return of investment
router.get(
  '/get-roi',
  auth_admin.authAdmin,
  accessAdminAuth('view-project'),
  listingControllers.getListingsROI
);

// Export router
export default router;
