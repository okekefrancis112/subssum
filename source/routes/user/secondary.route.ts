import express from "express";

import * as secondaryController from "../../controllers/user/secondary.controller";
import validate from "./../../validations/user/validateObjectId";
import auth from "../../middlewares/auth.middleware";

const router = express.Router();

router.post(
    "/initiate/:investment_id",
    auth.auth,
    validate.validateInvestObjectId,
    secondaryController.initiateSecondaryMarket
);

export default router;
