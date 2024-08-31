import { FilterQuery, Types, UpdateQuery } from "mongoose";
import {
    IInvestmentDocument,
    IInvestmentStatus,
} from "../interfaces/investment.interface";
import { Investment } from "../models";

import { IInvestmentCategory } from "../interfaces/plan.interface";
import { ExpressRequest } from "../server";
import {
    convertDate,
    formatDecimal,
    format_query_decimal,
    repoPagination,
} from "../util";

class InvestRepository {
    // This function creates an investment document in the database
    public async create({
        investment_category = IInvestmentCategory.FIXED,
        user_id,
        plan,
        listing_id,
        no_tokens,
        amount,
        investment_occurrence,
        duration,
        start_date,
        end_date,
        next_disbursement_date,
        session,
    }: {
        investment_category?: string;
        user_id?: Types.ObjectId;
        plan?: Types.ObjectId;
        listing_id?: Types.ObjectId;
        no_tokens: number;
        amount: number;
        investment_occurrence: number;
        duration: number;
        start_date: Date;
        end_date: Date;
        next_disbursement_date?: Date;
        session: any;
    }): Promise<IInvestmentDocument[] | null> {
        const data = {
            investment_category,
            user_id,
            plan,
            no_tokens,
            listing_id,
            amount,
            investment_occurrence,
            duration,
            start_date,
            end_date,
            next_disbursement_date,
        };

        const invest = await Investment.create([data], { session });

        return invest;
    }

    public async getOne(
        query: FilterQuery<IInvestmentDocument>,
        populate: string = ""
    ): Promise<IInvestmentDocument | null | any> {
        return Investment.findOne(query).populate(populate).lean(true);
    }

    public async find(
        query: FilterQuery<IInvestmentDocument>,
        populate: string = ""
    ): Promise<IInvestmentDocument[]> {
        return Investment.find(query)
            .populate(populate)
            .sort({ createdAt: -1 });
    }

    public async atomicUpdate(
        query: FilterQuery<IInvestmentDocument>,
        record: UpdateQuery<IInvestmentDocument>,
        session: any = null
    ): Promise<IInvestmentDocument | null> {
        return Investment.findOneAndUpdate(query, record, {
            session,
            new: true,
        });
    }

    public async getAllInvestment(
        req: ExpressRequest,
        user_id: Types.ObjectId,
        portfolio_id: Types.ObjectId
    ): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;

        const investment_pipeline: any = [
            { $match: { user_id: user_id, plan: portfolio_id } },
            {
                $match: {
                    investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
                },
            },
            {
                $lookup: {
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },
            { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "plans",
                    localField: "plan",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    _id: 1,
                    asset_name: "$listing.project_name",
                    asset_location: "$listing.location",
                    asset_image: "$listing.project_image",
                    listing_id: "$listing._id",
                    portfolio_id: "$plan._id",
                    portfolio_name: "$plan.plan_name",
                    monthly_returns: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$investment_category",
                                    IInvestmentCategory.FLEXIBLE,
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                // Current Date
                                                {
                                                    $subtract: [
                                                        "$$NOW",
                                                        "$last_dividends_date",
                                                    ],
                                                },

                                                // Completed Date
                                                {
                                                    $subtract: [
                                                        "$end_date",
                                                        "$start_date",
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $multiply: [
                                                "$amount",
                                                {
                                                    $divide: [
                                                        {
                                                            $ifNull: [
                                                                "$listing.flexible_returns",
                                                                "$listing.returns",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                1000
                            ),
                            else: format_query_decimal(
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                // Current Date
                                                {
                                                    $subtract: [
                                                        "$$NOW",
                                                        "$start_date",
                                                    ],
                                                },

                                                // Completed Date
                                                {
                                                    $subtract: [
                                                        "$end_date",
                                                        "$start_date",
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $multiply: [
                                                "$amount",
                                                {
                                                    $divide: [
                                                        {
                                                            $ifNull: [
                                                                "$listing.fixed_returns",
                                                                "$listing.returns",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                1000
                            ),
                        },
                    },
                    expected_payout: format_query_decimal(
                        {
                            $cond: {
                                if: {
                                    $eq: [
                                        "$investment_category",
                                        IInvestmentCategory.FLEXIBLE,
                                    ],
                                },

                                then: {
                                    $add: [
                                        {
                                            $multiply: [
                                                "$amount",
                                                {
                                                    $divide: [
                                                        {
                                                            $ifNull: [
                                                                "$listing.flexible_returns",
                                                                "$listing.returns",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                        "$amount",
                                    ],
                                },
                                else: {
                                    $add: [
                                        {
                                            $multiply: [
                                                "$amount",
                                                {
                                                    $divide: [
                                                        {
                                                            $ifNull: [
                                                                "$listing.fixed_returns",
                                                                "$listing.returns",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                        "$amount",
                                    ],
                                },
                            },
                        },
                        100
                    ),

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $eq: [
                                                "$investment_category",
                                                IInvestmentCategory.FLEXIBLE,
                                            ],
                                        },
                                        then: format_query_decimal(
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: [
                                                            // Current Date
                                                            {
                                                                $subtract: [
                                                                    "$$NOW",
                                                                    "$last_dividends_date",
                                                                ],
                                                            },

                                                            // Completed Date
                                                            {
                                                                $subtract: [
                                                                    "$end_date",
                                                                    "$start_date",
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        $multiply: [
                                                            "$amount",
                                                            {
                                                                $divide: [
                                                                    {
                                                                        $ifNull:
                                                                            [
                                                                                "$listing.flexible_returns",
                                                                                "$listing.returns",
                                                                            ],
                                                                    },
                                                                    100,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            1000
                                        ),
                                        else: format_query_decimal(
                                            {
                                                $multiply: [
                                                    {
                                                        $divide: [
                                                            // Current Date
                                                            {
                                                                $subtract: [
                                                                    "$$NOW",
                                                                    "$start_date",
                                                                ],
                                                            },

                                                            // Completed Date
                                                            {
                                                                $subtract: [
                                                                    "$end_date",
                                                                    "$start_date",
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        $multiply: [
                                                            "$amount",
                                                            {
                                                                $divide: [
                                                                    {
                                                                        $ifNull:
                                                                            [
                                                                                "$listing.fixed_returns",
                                                                                "$listing.returns",
                                                                            ],
                                                                    },
                                                                    100,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            1000
                                        ),
                                    },
                                },
                            ],
                        },
                        100
                    ),
                    cash_dividend: {
                        $ifNull: ["$listing.cash_dividend", 0],
                    },
                    duration: 1,
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    returns: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$investment_category",
                                    IInvestmentCategory.FIXED,
                                ],
                            },
                            then: {
                                $ifNull: [
                                    "$listing.fixed_returns",
                                    "$listing.returns",
                                ],
                            },
                            else: {
                                $ifNull: [
                                    "$listing.flexible_returns",
                                    "$listing.returns",
                                ],
                            },
                        },
                    },
                    maturity_date: "$end_date",
                    start_date: 1,
                    amount_invested: format_query_decimal("$amount", 100),
                    auto_reinvest: 1,
                    investment_occurrence: 1,
                    createdAt: 1,
                    investment_status: 1,
                    investment_category: {
                        $ifNull: ["$investment_category", "fixed"],
                    },
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const investment = await Investment.aggregate(investment_pipeline);

        const total = await Investment.countDocuments({
            user_id: user_id,
            plan: portfolio_id,
        });

        const pagination = repoPagination({ page, perpage, total: total! });

        const total_amount_invested = investment.reduce(
            (acc: number, curr: any) => acc + curr.amount_invested,
            0
        );

        const total_current_value = investment.reduce(
            (acc: number, curr: any) => acc + curr.current_value,
            0
        );

        const total_expected_payout = investment.reduce(
            (acc: number, curr: any) => acc + curr.expected_payout,
            0
        );

        const total_monthly_returns = investment.reduce(
            (acc: number, curr: any) => acc + curr.monthly_returns,
            0
        );

        // Return the data and pagination object
        return {
            data: {
                investment,
                total_amount_invested: formatDecimal(
                    total_amount_invested,
                    100
                ),
                total_current_value: formatDecimal(total_current_value, 100),
                total_expected_payout: formatDecimal(
                    total_expected_payout,
                    100
                ),
                total_monthly_returns: formatDecimal(
                    total_monthly_returns,
                    100
                ),

                dividend_preference: investment[0].investment_category,
            },
            pagination,
        };
    }
}

export default new InvestRepository();
