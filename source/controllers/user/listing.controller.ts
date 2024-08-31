import { Response } from "express";
import { Types } from "mongoose";

import { ExpressRequest } from "../../server";
import ResponseHandler from "../../util/response-handler";
import listingRepository from "../../repositories/listing.repository";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import {
    IInvestmentPreference,
    IListingDocument,
    IListingStatus,
} from "../../interfaces/listing.interface";

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
        let { listings, pagination } =
            await listingRepository.getAllListingsLanding(req);

        listings = listings.map((listing: { minimum_amount?: number }) => ({
            ...listing,
            minimum_amount: listing.minimum_amount || 0,
        }));

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your single listing information successfully fetched",
            data: { listings, pagination },
        });
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

/******
 *
 *
 * Get Listings ROI and Holding Period
 */
export async function getNewListingsROI(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const data: any = [];
        let unique_returns = [
            {
                $match: {
                    // fixed_range: { $ne: null },
                    // flexible_range: { $ne: null },
                    // fixed_returns: { $ne: null },
                    // flexible_returns: { $ne: null },
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
                    fixed_range: { $first: "$fixed_range" },
                    flexible_range: { $first: "$flexible_range" },
                    fixed_returns: { $first: "$fixed_returns" },
                    flexible_returns: { $first: "$flexible_returns" },
                    createdAt: { $first: "$createdAt" },
                },
            },
            {
                $sort: { "_id.holding_period": 1 },
            },

            {
                $project: {
                    _id: 0,
                    fixed_range: "$fixed_range",
                    flexible_range: "$flexible_range",
                    fixed_returns: "$fixed_returns",
                    flexible_returns: "$flexible_returns",
                    holding_period: "$_id.holding_period",
                },
            },
        ];

        const listings = await listingRepository.findAggregate(unique_returns);

        listings.forEach((e: any) => {
            data.push({
                range: e.flexible_range,
                returns: e.flexible_returns,
                holding_period: e.holding_period,
                type: "flexible",
            });
            data.push({
                range: e.fixed_range,
                returns: e.fixed_returns,
                holding_period: e.holding_period,
                type: "fixed",
            });
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Listing ROI and holding period retrieved successfully.",
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

async function handleListingsRequest(
    stages: any[],
    res: Response
): Promise<Response | void> {
    const listings = await listingRepository.findAggregate(stages);

    if (listings) {
        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Listing ROI and holding period retrieved successfully.",
            data: listings,
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
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const pipeline = [
            { $match: { _id: listing_id } },
            {
                $project: {
                    _id: 1,
                    project_name: 1,
                    project_image: 1,
                    fixed_returns: 1,
                    fixed_range: 1,
                    flexible_returns: 1,
                    flexible_range: 1,
                    description: 1,
                    strategy: 1,
                    holding_period: 1,
                    returns: 1,
                    minimum_amount: 1,
                    location: 1,
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
                    investment_category: 1,
                    map_url: 1,
                    avg_amount_appreciation: 1,
                    avg_amount_rental: 1,
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
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message:
                    "Your single listing information successfully fetched.",
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
 * Fetch Single Listing About (Mobile)
 */
export async function getSingleListingAboutMobile(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const listing_id = new Types.ObjectId(req.params.listing_id);
        const pipeline = [
            { $match: { _id: listing_id } },
            {
                $project: {
                    _id: 1,
                    project_name: 1,
                    project_image: 1,
                    fixed_returns: 1,
                    fixed_range: 1,
                    flexible_returns: 1,
                    flexible_range: 1,
                    description: 1,
                    strategy: 1,
                    holding_period: 1,
                    returns: 1,
                    minimum_amount: 1,
                    location: 1,
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
                    investment_category: 1,
                    map_url: 1,
                    avg_amount_appreciation: {
                        $ifNull: ["$avg_amount_appreciation", "not available"],
                    },
                    avg_amount_rental: {
                        $ifNull: ["$avg_amount_rental", "not available"],
                    },
                    avg_occupancy_rate: {
                        $ifNull: ["$avg_occupancy_rate", "not available"],
                    },
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

        // Create an array of objects for questions and answers dynamically
        const questionsAndAnswers = [];
        const neighborhoodAttractions = [];
        const maxNumberOfQuestions = 7;

        // Assuming the fields are named question_1, answer_1, neighborhood_attraction_1, neighborhood_attraction_1_image, etc.
        for (let i = 1; i <= maxNumberOfQuestions; i++) {
            const questionField = `question_${i}`;
            const answerField = `answer_${i}`;
            const neighborhood_attraction = `neighborhood_attraction_${i}`;
            const neighborhood_attraction_image = `neighborhood_attraction_${i}_image`;

            if (about[0][questionField] && about[0][answerField]) {
                questionsAndAnswers.push({
                    question: about[0][questionField],
                    answer: about[0][answerField],
                });
            }

            if (
                about[0][neighborhood_attraction] &&
                about[0][neighborhood_attraction_image]
            ) {
                neighborhoodAttractions.push({
                    name: about[0][neighborhood_attraction],
                    image: about[0][neighborhood_attraction_image],
                });
            }
        }

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your single listing information successfully fetched.",
            data: {
                _id: about[0]._id,
                project_name: about[0].project_name,
                project_image: about[0].project_image,
                fixed_returns: about[0].fixed_returns,
                fixed_range: about[0].fixed_range,
                flexible_returns: about[0].flexible_returns,
                flexible_range: about[0].flexible_range,
                description: about[0].description,
                strategy: about[0].strategy,
                holding_period: about[0].holding_period,
                returns: about[0].returns,
                minimum_amount: about[0].minimum_amount,
                location: about[0].location,
                status: about[0].status,
                audience: about[0].audience,
                total_amount: about[0].total_amount,
                roi_range: about[0].roi_range,
                parties_involved: about[0].parties_involved,
                asset_type: about[0].asset_type,
                investment_category: about[0].investment_category,
                map_url: about[0].map_url,
                avg_amount_appreciation: about[0].avg_amount_appreciation,
                avg_amount_rental: about[0].avg_amount_rental,
                avg_occupancy_rate: about[0].avg_occupancy_rate,
                neighborhoodAttractions: neighborhoodAttractions,
                questionsAndAnswers: questionsAndAnswers,
                activities: about[0].activities,
                createdAt: about[0].createdAt,
            },
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
