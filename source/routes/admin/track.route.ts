// Import express module
import express from "express";

// Import controllers and validations
import * as trackControllers from "../../controllers/admin/track.controller";
import * as trackValidations from "../../validations/admin/track.validation";
import accessAdminAuth from "../../middlewares/access-auth.middleware";
import auth_admin from "../../middlewares/auth-admin.middleware";

// Create router instance
const router = express.Router();

// Routes for User Track

// POST route to create a user track
router.post(
    "/create",
    auth_admin.authAdmin,
    accessAdminAuth("create-track-record"),
    trackValidations.validateCreateTrack,
    trackControllers.createTrack
);

// GET route to get all user tracks
router.get(
    "/get-tracks",
    auth_admin.authAdmin,
    accessAdminAuth("view-track-record"),
    trackControllers.getTrack
);

// PUT route to edit a user track information
router.put(
    "/update/:track_id",
    auth_admin.authAdmin,
    accessAdminAuth("create-track-record"),
    trackValidations.validateTrackId,
    trackControllers.updateTrack
);

// DELETE route to delete a single track information
router.delete(
    "/delete/:track_id",
    auth_admin.authAdmin,
    accessAdminAuth("delete-track-record"),
    trackValidations.validateTrackId,
    trackControllers.deleteTrack
);

/***********************************************************************
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

// GET route to get track information (Landing Page)
router.get("/get", trackControllers.getTracksLanding);

// Export router
export default router;
