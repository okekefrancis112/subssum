// Import express module
import express from "express";

// Import controllers and validations
import * as listingControllers from "../../controllers/user/listing.controller";
import * as adminValidations from "../../validations/admin/listing.validation";
import auth from "../../middlewares/auth.middleware";

// Create router instance
const router = express.Router();

// Routes for Listings

// GET route to get all listings
router.get("/get", listingControllers.getListings);

// GET route to get listings return of investment
router.get("/get-roi", auth.auth, listingControllers.getListingsROI);
router.get("/get-roi-2", auth.auth, listingControllers.getNewListingsROI);

// GET route to get one listings
router.get(
    "/get-listing/:listing_id",
    adminValidations.validateListingId, // validation middleware
    listingControllers.getSingleListingAbout // controller to handle the request
);

// GET route to get one listings
router.get(
    "/get-listing-mobile/:listing_id",
    adminValidations.validateListingId, // validation middleware
    listingControllers.getSingleListingAboutMobile // controller to handle the request
);

// Export router
export default router;
