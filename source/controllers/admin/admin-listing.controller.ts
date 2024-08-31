import { Response } from "express";
import { UploadedFile } from "express-fileupload";
import { Types } from "mongoose";

import { ExpressRequest } from "../../server";
import ImageService from "../../services/image.service";
import ResponseHandler from "../../util/response-handler";
import listingRepository from "../../repositories/listing.repository";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import UtilFunctions, {
    export2Csv,
    throwIfAdminUserUndefined,
    slugify,
    image,
} from "../../util";
import investmentRepository from "../../repositories/investment.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import {
    IListingAudience,
    IListingStatus,
} from "../../interfaces/listing.interface";
import { DeletionTaskJob } from "../../services/queues/producer.service";

export async function createListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const {
            project_name,
            description,
            minimum_amount,
            total_amount,
            location,
            holding_period,
            status,
            parties_involved,
            returns,
            roi_range,
            strategy,
        } = req.body;

        let uploadProjectImage;

        if (req.files?.project_image) {
            const project_image = req.files.project_image as UploadedFile;

            const validateFileResult = await UtilFunctions.validateUploadedFile(
                {
                    file: project_image,
                }
            );

            if (!validateFileResult.success) {
                return ResponseHandler.sendErrorResponse({
                    code: HTTP_CODES.BAD_REQUEST,
                    error: validateFileResult.error as string,
                    res,
                });
            }

            uploadProjectImage = await ImageService.uploadImageToS3(
                `project-${UtilFunctions.generateRandomString(7)}`,
                project_image,
                project_image.mimetype
            );
        }
        const slug: string = slugify(project_name);

        const listing = await listingRepository.create({
            project_name,
            slug: slug,
            project_image: uploadProjectImage,
            description,
            minimum_amount,
            total_amount,
            location,
            holding_period,
            available_tokens: 2000000000,
            audience: IListingAudience.USER,
            status,
            created_by: admin_user._id,
            parties_involved,
            returns,
            roi_range,
            strategy,
        });

        if (listing) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listing created successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message:
                    "Success! Your new listing is now live and ready to be viewed by interested parties.",
                data: listing,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function createNewListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const {
            project_name,
            description,
            minimum_amount,
            total_amount,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            location,
            holding_period,
            status,
            parties_involved,
            returns,
            roi_range,
            strategy,
            asset_type,
            map_url,
            capital_appreciation,
            avg_amount_rental,
            avg_amount_appreciation,
            avg_occupancy_rate,
            neighborhood_attraction_1,
            neighborhood_attraction_2,
            neighborhood_attraction_3,
            neighborhood_attraction_4,
            question_1,
            answer_1,
            question_2,
            answer_2,
            question_3,
            answer_3,
            question_4,
            answer_4,
            question_5,
            answer_5,
            question_6,
            answer_6,
        } = req.body;

        let uploadProjectImage: any;
        let uploadAttractionImage1: any;
        let uploadAttractionImage2: any;
        let uploadAttractionImage3: any;
        let uploadAttractionImage4: any;

        if (req.files) {
            if (req.files.project_image) {
                uploadProjectImage = await image(
                    res,
                    req.files.project_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_1_image) {
                uploadAttractionImage1 = await image(
                    res,
                    req.files.neighborhood_attraction_1_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_2_image) {
                uploadAttractionImage2 = await image(
                    res,
                    req.files.neighborhood_attraction_2_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_3_image) {
                uploadAttractionImage3 = await image(
                    res,
                    req.files.neighborhood_attraction_3_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_4_image) {
                uploadAttractionImage4 = await image(
                    res,
                    req.files.neighborhood_attraction_4_image as UploadedFile
                );
            }
        }

        const slug: string = slugify(project_name);

        const listing = await listingRepository.createNew({
            project_name,
            description,
            slug: slug,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            project_image: uploadProjectImage || "",
            minimum_amount,
            total_amount,
            location,
            holding_period,
            available_tokens: 2000000000,
            audience: IListingAudience.USER,
            status,
            created_by: admin_user._id,
            parties_involved,
            returns,
            roi_range,
            strategy,
            asset_type,
            map_url,
            capital_appreciation,
            avg_amount_rental,
            avg_amount_appreciation,
            avg_occupancy_rate,
            neighborhood_attraction_1,
            neighborhood_attraction_1_image: uploadAttractionImage1 || "",
            neighborhood_attraction_2,
            neighborhood_attraction_2_image: uploadAttractionImage2 || "",
            neighborhood_attraction_3,
            neighborhood_attraction_3_image: uploadAttractionImage3 || "",
            neighborhood_attraction_4,
            neighborhood_attraction_4_image: uploadAttractionImage4 || "",
            question_1,
            answer_1,
            question_2,
            answer_2,
            question_3,
            answer_3,
            question_4,
            answer_4,
            question_5,
            answer_5,
            question_6,
            answer_6,
        });

        // Audit
        await auditRepository.create({
            req,
            title: "Listing created successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message:
                "Success! Your new listing is now live and ready to be viewed by interested parties.",
            data: listing,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function createRecurringListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const {
            time,
            project_name,
            description,
            minimum_amount,
            total_amount,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            location,
            holding_period,
            status,
            parties_involved,
            returns,
            roi_range,
            strategy,
            asset_type,
            map_url,
            capital_appreciation,
            avg_amount_rental,
            avg_amount_appreciation,
            avg_occupancy_rate,
            neighborhood_attraction_1,
            neighborhood_attraction_2,
            neighborhood_attraction_3,
            neighborhood_attraction_4,
            question_1,
            answer_1,
            question_2,
            answer_2,
            question_3,
            answer_3,
            question_4,
            answer_4,
            question_5,
            answer_5,
            question_6,
            answer_6,
        } = req.body;

        let uploadProjectImage: any;
        let uploadAttractionImage1: any;
        let uploadAttractionImage2: any;
        let uploadAttractionImage3: any;
        let uploadAttractionImage4: any;

        if (req.files) {
            if (req.files.project_image) {
                uploadProjectImage = await image(
                    res,
                    req.files.project_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_1_image) {
                uploadAttractionImage1 = await image(
                    res,
                    req.files.neighborhood_attraction_1_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_2_image) {
                uploadAttractionImage2 = await image(
                    res,
                    req.files.neighborhood_attraction_2_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_3_image) {
                uploadAttractionImage3 = await image(
                    res,
                    req.files.neighborhood_attraction_3_image as UploadedFile
                );
            }
            if (req.files.neighborhood_attraction_4_image) {
                uploadAttractionImage4 = await image(
                    res,
                    req.files.neighborhood_attraction_4_image as UploadedFile
                );
            }
        }

        const slug: string = slugify(project_name);

        const listing = await listingRepository.createNew({
            time,
            project_name,
            description,
            slug: slug,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            project_image: uploadProjectImage || "",
            minimum_amount,
            total_amount,
            location,
            holding_period,
            available_tokens: 2000000000,
            audience: IListingAudience.USER,
            status,
            created_by: admin_user._id,
            parties_involved,
            returns,
            roi_range,
            strategy,
            asset_type,
            map_url,
            capital_appreciation,
            avg_amount_rental,
            avg_amount_appreciation,
            avg_occupancy_rate,
            neighborhood_attraction_1,
            neighborhood_attraction_1_image: uploadAttractionImage1 || "",
            neighborhood_attraction_2,
            neighborhood_attraction_2_image: uploadAttractionImage2 || "",
            neighborhood_attraction_3,
            neighborhood_attraction_3_image: uploadAttractionImage3 || "",
            neighborhood_attraction_4,
            neighborhood_attraction_4_image: uploadAttractionImage4 || "",
            question_1,
            answer_1,
            question_2,
            answer_2,
            question_3,
            answer_3,
            question_4,
            answer_4,
            question_5,
            answer_5,
            question_6,
            answer_6,
        });

        // Audit
        await auditRepository.create({
            req,
            title: "Listing created successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        await DeletionTaskJob({
            name: "Assest Auto deletion",
            data: {
                timer: listing?.time,
                listing_id: listing?._id,
                created: listing?.createdAt,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message:
                "Success! Your new listing is now live and ready to be viewed by interested parties.",
            data: listing,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/***
 *
 *
 * Get Listings
 */
export async function getListings(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listings = await listingRepository.getAll(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Listings fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Listings retrieved successfully.",
            data: listings,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Fetch Single Listing About
 */
export async function getSingleListingAbout(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listing_id = new Types.ObjectId(req.params.listing_id);

        const pipeline = [
            { $match: { _id: listing_id } },
            {
                $project: {
                    _id: 1,
                    project_name: 1,
                    project_image: 1,
                    description: 1,
                    strategy: 1,
                    fixed_returns: 1,
                    fixed_range: 1,
                    flexible_returns: 1,
                    flexible_range: 1,
                    holding_period: 1,
                    returns: 1,
                    minimum_amount: 1,
                    currency: 1,
                    location: 1,
                    capital_appreciation: 1,
                    status: 1,
                    audience: 1,
                    total_amount: 1,
                    roi_range: 1,
                    parties_involved: {
                        $map: {
                            input: {
                                $split: [
                                    {
                                        $trim: {
                                            input: "$parties_involved",
                                            chars: " ",
                                        },
                                    },
                                    "+",
                                ],
                            },
                            as: "party",
                            in: { $trim: { input: "$$party", chars: " " } },
                        },
                    },
                    asset_type: 1,
                    map_url: 1,
                    avg_amount_rental: 1,
                    avg_amount_appreciation: 1,
                    avg_occupancy_rate: 1,
                    neighborhood_attraction_1: 1,
                    neighborhood_attraction_1_image: 1,
                    neighborhood_attraction_2: 1,
                    neighborhood_attraction_2_image: 1,
                    neighborhood_attraction_3: 1,
                    neighborhood_attraction_3_image: 1,
                    neighborhood_attraction_4: 1,
                    neighborhood_attraction_4_image: 1,
                    question_1: 1,
                    answer_1: 1,
                    question_2: 1,
                    answer_2: 1,
                    question_3: 1,
                    answer_3: 1,
                    question_4: 1,
                    answer_4: 1,
                    question_5: 1,
                    answer_5: 1,
                    question_6: 1,
                    answer_6: 1,
                    createdAt: 1,
                    activities: {
                        $sortArray: {
                            input: "$activities",
                            sortBy: { date: -1 },
                        },
                    },
                },
            },
        ];

        const about = await listingRepository.findAggregate(pipeline);

        if (about) {
            // Audit
            await auditRepository.create({
                req,
                title: "Single listing about fetched successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Success! Selected listing details retrieved.",
                data: about,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Fetch Single Listing Fixed Transactions
 */
export async function getListingFixedTransaction(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { investment, pagination } =
            await investmentRepository.getAllListingFixedInvestments(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Single listing fixed transactions fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Selected listing fixed transactions retrieved.",
            data: { investment, pagination },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Fetch Single Listing Flexible Transactions
 */
export async function getListingFlexibleTransaction(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { investment, pagination } = await investmentRepository.getAllListingFlexibleInvestments(req);

        // Audit
        await auditRepository.create({
            req,
            title: "Single listing flexible transactions fetched successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message:
                "Success! Selected listing flexible transactions retrieved.",
            data: { investment, pagination },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Export Single Listing Fixed Transactions
 */
export async function exportListingFixedTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const listing_investments = await investmentRepository.exportAllListingFixedInvestments(req);
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "amount_invested",
            "investment_status",
            "payment_style",
            "payment_method",
            "start_date",
            "start_time",
            "no_tokens",
            "asset_name",
            "returns",
            "expected_payout",
            "monthly_returns",
            "current_value",
            "maturity_date",
            "maturity_time",
            "channel",
            "fx_rate",
        ];

        export2Csv(res, listing_investments, "listing_investments", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

/****
 *
 *
 * Export Single Listing Flexible Transactions
 */
export async function exportListingFlexibleTransactions(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const listing_investments =
            await investmentRepository.exportAllListingFlexibleInvestments(req);
        const fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "amount_invested",
            "payment_style",
            "payment_method",
            "returns",
            "start_date",
            "start_time",
            "no_tokens",
            "asset_name",
            "expected_payout",
            "current_returns",
            "cash_dividend",
            "maturity_date",
            "maturity_time",
            "channel",
            "fx_rate",
        ];

        export2Csv(res, listing_investments, "listing_investments", fields);
    } catch (error: any | Error | unknown) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: 500,
            error: error.message,
        });
    }
}

/****
 *
 *
 * Export Single Listing Transaction Cards
 */
export async function getListingTransactionCards(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const data = await listingRepository.listingTransactionCards(req);

        return ResponseHandler.sendSuccessResponse({
            res,
            message: "Listing transactions cards retrieved",
            data: data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/**
 *
 *
 * Edit Listings
 */

export async function editListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const {
            project_name,
            description,
            location,
            holding_period,
            minimum_amount,
            total_amount,
            status,
            parties_involved,
            strategy,
            returns,
            roi_range,
            asset_type,
        } = req.body;
        const listing = await listingRepository.getOne({ _id: listing_id });
        const listing_image = listing?.project_image;

        let uploadProjectImage;

        if (req.files?.project_image) {
            if (listing_image) {
                await ImageService.deleteImageFromS3(listing_image);
            }

            const project_image = req.files.project_image as UploadedFile;

            const validateFileResult = await UtilFunctions.validateUploadedFile(
                {
                    file: project_image,
                }
            );

            if (!validateFileResult.success) {
                return ResponseHandler.sendErrorResponse({
                    code: HTTP_CODES.BAD_REQUEST,
                    error: validateFileResult.error as string,
                    res,
                });
            }

            uploadProjectImage = await ImageService.uploadImageToS3(
                `project-${UtilFunctions.generateRandomString(7)}`,
                project_image,
                project_image.mimetype
            );
        }
        const slug: string = slugify(project_name);

        const edAdmin = await listingRepository.atomicUpdate(
            { _id: listing_id },
            {
                $set: {
                    project_name,
                    description,
                    location,
                    slug: slug,
                    holding_period,
                    project_image: uploadProjectImage,
                    parties_involved,
                    strategy,
                    returns,
                    roi_range,
                    minimum_amount,
                    total_amount,
                    status,
                    asset_type,
                },
            }
        );

        if (edAdmin) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listings edited successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Success! Your listing details have been updated.",
                data: edAdmin,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function editNewListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const {
            project_name,
            description,
            minimum_amount,
            total_amount,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            location,
            holding_period,
            status,
            parties_involved,
            returns,
            roi_range,
            strategy,
            asset_type,
            map_url,
            avg_amount_rental,
            avg_amount_appreciation,
            avg_occupancy_rate,
            neighborhood_attraction_1,
            neighborhood_attraction_2,
            neighborhood_attraction_3,
            neighborhood_attraction_4,
            question_1,
            answer_1,
            question_2,
            answer_2,
            question_3,
            answer_3,
            question_4,
            answer_4,
            question_5,
            answer_5,
            question_6,
            answer_6,
        } = req.body;

        const listing = await listingRepository.getOne({ _id: listing_id });
        const listing_image = listing?.project_image;
        const AttractionImage1 = listing?.neighborhood_attraction_1_image;
        const AttractionImage2 = listing?.neighborhood_attraction_2_image;
        const AttractionImage3 = listing?.neighborhood_attraction_3_image;
        const AttractionImage4 = listing?.neighborhood_attraction_4_image;

        let uploadProjectImage: any;
        let uploadAttractionImage1: any;
        let uploadAttractionImage2: any;
        let uploadAttractionImage3: any;
        let uploadAttractionImage4: any;

        if (req.files?.project_image) {
            if (listing_image) {
                await ImageService.deleteImageFromS3(listing_image);
            }

            const project_image = req.files.project_image as UploadedFile;
            uploadProjectImage = await image(res, project_image);
        }
        if (req.files?.neighborhood_attraction_1_image) {
            if (AttractionImage1) {
                await ImageService.deleteImageFromS3(AttractionImage1);
            }

            const neighborhood_attraction_1_image = req.files
                .neighborhood_attraction_1_image as UploadedFile;
            uploadAttractionImage1 = await image(
                res,
                neighborhood_attraction_1_image
            );
        }
        if (req.files?.neighborhood_attraction_2_image) {
            if (AttractionImage2) {
                await ImageService.deleteImageFromS3(AttractionImage2);
            }

            const neighborhood_attraction_2_image = req.files
                .neighborhood_attraction_2_image as UploadedFile;
            uploadAttractionImage2 = await image(
                res,
                neighborhood_attraction_2_image
            );
        }
        if (req.files?.neighborhood_attraction_3_image) {
            if (AttractionImage3) {
                await ImageService.deleteImageFromS3(AttractionImage3);
            }

            const neighborhood_attraction_3_image = req.files
                .neighborhood_attraction_3_image as UploadedFile;
            uploadAttractionImage3 = await image(
                res,
                neighborhood_attraction_3_image
            );
        }
        if (req.files?.neighborhood_attraction_4_image) {
            if (AttractionImage4) {
                await ImageService.deleteImageFromS3(AttractionImage4);
            }

            const neighborhood_attraction_4_image = req.files
                .neighborhood_attraction_4_image as UploadedFile;
            uploadAttractionImage4 = await image(
                res,
                neighborhood_attraction_4_image
            );
        }

        const slug: string = slugify(project_name);

        const edAdmin = await listingRepository.atomicUpdate(
            { _id: listing_id },
            {
                $set: {
                    project_name,
                    description,
                    slug: slug,
                    fixed_returns,
                    fixed_range,
                    flexible_returns,
                    flexible_range,
                    project_image: uploadProjectImage || "",
                    minimum_amount,
                    total_amount,
                    location,
                    holding_period,
                    available_tokens: 2000000000,
                    audience: IListingAudience.USER,
                    status,
                    created_by: admin_user._id,
                    parties_involved,
                    returns,
                    roi_range,
                    strategy,
                    asset_type,
                    map_url,
                    avg_amount_rental,
                    avg_amount_appreciation,
                    avg_occupancy_rate,
                    neighborhood_attraction_1,
                    neighborhood_attraction_1_image:
                        uploadAttractionImage1 || "",
                    neighborhood_attraction_2,
                    neighborhood_attraction_2_image:
                        uploadAttractionImage2 || "",
                    neighborhood_attraction_3,
                    neighborhood_attraction_3_image:
                        uploadAttractionImage3 || "",
                    neighborhood_attraction_4,
                    neighborhood_attraction_4_image:
                        uploadAttractionImage4 || "",
                    question_1,
                    answer_1,
                    question_2,
                    answer_2,
                    question_3,
                    answer_3,
                    question_4,
                    answer_4,
                    question_5,
                    answer_5,
                    question_6,
                    answer_6,
                },
            }
        );

        // Audit
        await auditRepository.create({
            req,
            title: "Listings edited successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your listing details have been updated.",
            data: edAdmin,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Delete Listing
 */
export async function deleteListing(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const listing = await listingRepository.getOne({ _id: listing_id });
        const listing_image = listing?.project_image;
        const AttractionImage1 = listing?.neighborhood_attraction_1_image;
        const AttractionImage2 = listing?.neighborhood_attraction_2_image;
        const AttractionImage3 = listing?.neighborhood_attraction_3_image;
        const AttractionImage4 = listing?.neighborhood_attraction_4_image;

        if (listing_image) {
            await ImageService.deleteImageFromS3(listing_image);
        }
        if (AttractionImage1) {
            await ImageService.deleteImageFromS3(AttractionImage1);
        }
        if (AttractionImage2) {
            await ImageService.deleteImageFromS3(AttractionImage2);
        }
        if (AttractionImage3) {
            await ImageService.deleteImageFromS3(AttractionImage3);
        }
        if (AttractionImage4) {
            await ImageService.deleteImageFromS3(AttractionImage4);
        }

        const delData = await listingRepository.deleteListing(listing_id);

        // Audit
        await auditRepository.create({
            req,
            title: "Listing deleted successfully",
            name: `${admin_user.first_name} ${admin_user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: admin_user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your listing has been deleted.",
            data: delData,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function deleteRecurringListing(listing_id: Types.ObjectId) {
    const listing = await listingRepository.getOne({
        _id: new Types.ObjectId(listing_id),
    });
    const listing_image = listing?.project_image;
    const AttractionImage1 = listing?.neighborhood_attraction_1_image;
    const AttractionImage2 = listing?.neighborhood_attraction_2_image;
    const AttractionImage3 = listing?.neighborhood_attraction_3_image;
    const AttractionImage4 = listing?.neighborhood_attraction_4_image;

    if (listing_image) {
        await ImageService.deleteImageFromS3(listing_image);
    }
    if (AttractionImage1) {
        await ImageService.deleteImageFromS3(AttractionImage1);
    }
    if (AttractionImage2) {
        await ImageService.deleteImageFromS3(AttractionImage2);
    }
    if (AttractionImage3) {
        await ImageService.deleteImageFromS3(AttractionImage3);
    }
    if (AttractionImage4) {
        await ImageService.deleteImageFromS3(AttractionImage4);
    }

    const delData = await listingRepository.deleteListing(listing_id);
}

/**
 *
 *
 * Create Listing Activities
 */

export async function createListingActivities(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const { title, content } = req.body;

        let uploadProjectActivityImage;

        if (req.files?.image) {
            const image = req.files.image as UploadedFile;

            const validateFileResult = await UtilFunctions.validateUploadedFile(
                {
                    file: image,
                }
            );

            if (!validateFileResult.success) {
                return ResponseHandler.sendErrorResponse({
                    code: HTTP_CODES.BAD_REQUEST,
                    error: validateFileResult.error as string,
                    res,
                });
            }

            uploadProjectActivityImage = await ImageService.uploadImageToS3(
                `project-activity-${UtilFunctions.generateRandomString(7)}`,
                image,
                image.mimetype
            );
        }

        const payload = {
            _id: new Types.ObjectId(),
            title,
            content,
            image: uploadProjectActivityImage,
            date: new Date(),
        };

        // Update Listing with listing-activities
        const listingUpdate = await listingRepository.atomicUpdate(
            { _id: listing_id },
            {
                $addToSet: { activities: payload },
            }
        );

        if (listingUpdate) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listing activity created successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Well done! You've created a new listing activity.",
                data: listingUpdate,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Fetch Single Listing Activities
 */
export async function getSingleListingActivities(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const act_id = new Types.ObjectId(req.params.activity_id);

        const pipeline = [
            { $unwind: "$activities" },
            { $match: { "activities._id": act_id } },
            { $project: { _id: false, assignments: "$activities" } },
        ];

        const activity = await listingRepository.findAggregate(pipeline);

        if (activity) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listing activity fetched successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message:
                    "Your listing activity has been fetched successfully!.",
                data: activity,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Update Listing Activity
 */

export async function editListingActivities(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { listing_id, activity_id } = req.params;
        const list_id = new Types.ObjectId(listing_id);
        const act_id = new Types.ObjectId(activity_id);
        const { title, content } = req.body;

        let delImage: any;

        const pipeline = [
            { $unwind: "$activities" },
            { $match: { "activities._id": act_id } },
            { $project: { _id: false, assignments: "$activities.image" } },
        ];

        const activity_image = await listingRepository.findAggregate(pipeline);
        activity_image.forEach((e: any) => {
            delImage = e.assignments;
        });

        if (delImage) {
            await ImageService.deleteImageFromS3(delImage);
        }

        let uploadProjectActivityImage;

        if (req.files?.image) {
            const image = req.files.image as UploadedFile;

            const validateFileResult = await UtilFunctions.validateUploadedFile(
                {
                    file: image,
                }
            );

            if (!validateFileResult.success) {
                return ResponseHandler.sendErrorResponse({
                    code: HTTP_CODES.BAD_REQUEST,
                    error: validateFileResult.error as string,
                    res,
                });
            }

            uploadProjectActivityImage = await ImageService.uploadImageToS3(
                `project-activity-${UtilFunctions.generateRandomString(7)}`,
                image,
                image.mimetype
            );
        }

        const edActivity = await listingRepository.updateActivity(
            list_id,
            act_id,
            {
                $set: {
                    "activities.$.title": title,
                    "activities.$.content": content,
                    "activities.$.image": uploadProjectActivityImage,
                    "activities.$.date": new Date(Date.now()),
                },
            }
        );

        if (edActivity) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listing activity edited successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message:
                    "Well done! Your listing activity details have been updated.",
                data: edActivity,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Delete Listing Activities
 */

export async function deleteListingActivity(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const admin_user = throwIfAdminUserUndefined(
            req.admin_user,
            "req.admin_user"
        );
        const { listing_id, activity_id } = req.params;
        const list_id = new Types.ObjectId(listing_id);
        const act_id = new Types.ObjectId(activity_id);

        let delImage: any;

        const pipeline = [
            { $unwind: "$activities" },
            { $match: { "activities._id": act_id } },
            { $project: { _id: false, assignments: "$activities.image" } },
        ];

        const activity_image = await listingRepository.findAggregate(pipeline);
        activity_image.forEach((e: any) => {
            delImage = e.assignments;
        });

        // Delete Listing Activity
        if (delImage) {
            await ImageService.deleteImageFromS3(delImage);
        }

        const delData = await listingRepository.atomicUpdate(
            { _id: list_id },
            {
                $pull: { activities: { _id: act_id } },
            }
        );

        if (delData) {
            // Audit
            await auditRepository.create({
                req,
                title: "Listing activity deleted successfully",
                name: `${admin_user.first_name} ${admin_user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: admin_user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Your listing activity has been deleted.",
                data: delData,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/******
 *
 *
 * Get Listings ROi and Holding Period
 */
export async function getListingsROI(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        let unique_returns = [
            {
                $match: {
                    status: IListingStatus.ACTIVE,
                    // ! This is used to filter out listings that were in Keble 1.0
                    createdAt: { $gte: new Date("2023-06-13") },
                },
            },
            {
                $sort: { createdAt: 1 },
            },

            {
                $group: {
                    _id: {
                        holding_period: "$holding_period",
                    },
                    range: { $first: "$roi_range" },
                    returns: { $first: "$returns" },
                    createdAt: { $first: "$createdAt" },
                },
            },
            {
                $sort: { "_id.holding_period": 1 },
            },

            {
                $project: {
                    _id: 0,
                    roi_range: "$range",
                    returns: "$returns",
                    holding_period: "$_id.holding_period",
                },
            },
        ];
        const listings = await listingRepository.findAggregate(unique_returns);

        if (listings) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message:
                    "Listing ROI and holding period retrieved successfully.",
                data: listings,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
