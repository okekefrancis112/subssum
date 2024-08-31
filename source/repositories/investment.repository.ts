import { FilterQuery, Types, UpdateQuery } from "mongoose";
import {
    IInvestmentDocument,
    IInvestmentStatus,
    IInvestmentType,
} from "../interfaces/investment.interface";
import { Investment } from "../models";
import { ExpressRequest } from "../server";
import UtilFunctions, {
    convertDate,
    format_query_decimal,
    getMonthsDate,
    repoExportPlanFixedPipeline,
    repoInvestmentCategory,
    repoInvestmentType,
    repoPagination,
    repoPaymentChannel,
    repoPaymentMethod,
    repoReinvest,
    repoSearch,
    repoTime,
    repoTransactionPaymentChannel,
    repoTransactionPaymentMethod,
} from "../util";
import moment from "moment";
import {
    IInvestmentCategory,
    IPortfolioOccurrence,
} from "../interfaces/plan.interface";

class InvestmentRepository {
    // This function creates an investment document in the database
    public async create({
        investment_category = IInvestmentCategory.FIXED,
        investment_type = IInvestmentType.FIXED,
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
        last_dividends_date,
        is_auto_reinvested,
        reinvested_as,
        reinvested_from,
        transaction_id,
        session,
    }: {
        investment_category?: string;
        investment_type?: IInvestmentType;
        user_id?: Types.ObjectId;
        plan?: Types.ObjectId;
        listing_id?: Types.ObjectId;
        no_tokens: number;
        amount: number;
        investment_occurrence: string;
        duration: number;
        start_date: Date;
        end_date: Date;
        next_disbursement_date?: Date;
        last_dividends_date?: Date;
        is_auto_reinvested?: boolean;
        reinvested_as?: string;
        reinvested_from?: Types.ObjectId;
        transaction_id?: Types.ObjectId;
        session: any;
    }): Promise<IInvestmentDocument[]> {
        const data = {
            investment_category,
            investment_type,
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
            is_auto_reinvested,
            reinvested_as,
            reinvested_from,
            transaction_id,
            last_dividends_date,
        };

        // Create the investment document in the database
        const invest = await Investment.create([data], { session });

        return invest;
    }

    public async find(
        query: FilterQuery<IInvestmentDocument>,
        populate: string = ""
    ): Promise<IInvestmentDocument[] | any> {
        return Investment.find(query)
            .populate(populate)
            .sort({ createdAt: -1 });
    }

    public async findOneInvestment(
        query: FilterQuery<IInvestmentDocument>
    ): Promise<IInvestmentDocument | null> {
        return Investment.findOne(query).sort({ createdAt: -1 });
    }

    public async deleteOne(
        query: FilterQuery<IInvestmentDocument>
    ): Promise<IInvestmentDocument | null> {
        return Investment.findOneAndDelete(query);
    }

    public async findInv(req: ExpressRequest): Promise<IInvestmentDocument[]> {
        // Extract query parameters from the request object
        const { query } = req;
        const search = String(query.search);
        let filterQuery = {};

        // Check if search query is present and has valid length
        if (search !== "undefined" && Object.keys(search).length > 0) {
            // Create a regex expression for the search query
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                ],
            };
        }

        const filter = { ...filterQuery };
        return Investment.find(filter).populate("").sort({ createdAt: -1 });
    }

    public async getOne(
        investment_id: Types.ObjectId
    ): Promise<IInvestmentDocument | null> {
        return Investment.findOne({ _id: investment_id });
    }

    public async getOneWithUser(
        investment_id: Types.ObjectId,
        user_id: Types.ObjectId
    ): Promise<IInvestmentDocument | null | any> {
        return Investment.findOne({ _id: investment_id, user_id });
    }

    public async atomicUpdate(
        investment_id: Types.ObjectId,
        record: UpdateQuery<IInvestmentDocument>,
        session: any = null
    ) {
        // Finds one investment and updates it with the new data
        return Investment.findOneAndUpdate(
            { _id: investment_id },
            { ...record },
            { new: true, session }
        );
    }

    // Gets all Investments
    public async getAll(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom = query.dateFrom || "Jan 1 2021";
        const dateTo = query.dateTo || `${Date()}`;
        const channel = String(query.channel) || "all";
        const payment_style = String(query.payment_style) || "all";
        const investment_type = String(query.investment_type) || "all";
        const investment_category = String(query.investment_category) || "all";
        let period = String(query.period) || "all"; // Set the period

        let payment_style_filter = {};

        const filterChannel = repoPaymentChannel({ channel: channel });

        // Check the investment_category and add it to the search query object
        const filterInvestment = repoInvestmentType({
            investment_type: investment_type,
        });

        // Check the investment_category and add it to the search query object
        const filterCategory = repoInvestmentCategory({
            investment_category: investment_category,
        });

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        const filter = {
            ...timeFilter,
            ...searching,
            ...filterChannel,
            ...filterInvestment,
            ...filterCategory,
            ...payment_style_filter,
        };

        // Get investment transactions from the database
        const investment_pipeline = [
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
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            {
                $unwind: {
                    path: "$transaction",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $match: { "user.is_disabled": false },
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
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_category: 1,
                    investment_type: 1,
                    investment_status: 1,
                    duration: 1,
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    start_date: "$start_date",
                    payment_style: "$investment_occurrence",
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    channel: "$transaction.payment_gateway",
                    payment_method: "$transaction.transaction_medium",
                    amount_invested: format_query_decimal("$amount", 100),
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    current_returns: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$investment_category",
                                    IInvestmentCategory.FIXED,
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $divide: [
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
                                        "$duration",
                                    ],
                                },
                                1000
                            ),
                            else: format_query_decimal(
                                {
                                    $divide: [
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
                                        "$duration",
                                    ],
                                },
                                1000
                            ),
                        },
                    },

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: {
                                            $cond: {
                                                if: {
                                                    $eq: [
                                                        "$investment_category",
                                                        IInvestmentCategory.FIXED,
                                                    ],
                                                },
                                                then: format_query_decimal(
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
                                                    1000
                                                ),
                                                else: format_query_decimal(
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
                                                    1000
                                                ),
                                            },
                                        },

                                        else: {
                                            $cond: {
                                                if: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$investment_status",
                                                                IInvestmentStatus.INVESTMENT_ACTIVE,
                                                            ],
                                                        },
                                                        {
                                                            $eq: [
                                                                "$investment_category",
                                                                IInvestmentCategory.FLEXIBLE,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                then: format_query_decimal(
                                                    {
                                                        $multiply: [
                                                            {
                                                                $divide: [
                                                                    // Current Date
                                                                    {
                                                                        $subtract:
                                                                            [
                                                                                "$$NOW",
                                                                                "$last_dividends_date",
                                                                            ],
                                                                    },

                                                                    // Completed Date
                                                                    {
                                                                        $subtract:
                                                                            [
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
                                                                        $divide:
                                                                            [
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
                                                                        $subtract:
                                                                            [
                                                                                "$$NOW",
                                                                                "$start_date",
                                                                            ],
                                                                    },

                                                                    // Completed Date
                                                                    {
                                                                        $subtract:
                                                                            [
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
                                                                        $divide:
                                                                            [
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
                                    },
                                },
                            ],
                        },
                        100
                    ),

                    expected_payout: format_query_decimal(
                        {
                            $cond: {
                                if: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$investment_status",
                                                IInvestmentStatus.INVESTMENT_ACTIVE,
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$investment_category",
                                                IInvestmentCategory.FLEXIBLE,
                                            ],
                                        },
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

                    maturity_date: "$end_date",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const investment = await this.findAggregate(investment_pipeline);

        // Get the total number of investments
        const invest_total = await this.findAggregate([
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
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            {
                $unwind: {
                    path: "$transaction",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $match: { "user.is_disabled": false },
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
                $match: filter,
            },
        ]);

        const total = invest_total?.length;

        const pagination = repoPagination({ page, perpage, total: total! });

        // Return the data and pagination object
        return {
            data: investment,
            pagination,
        };
    }

    // Gets all Investments
    public async getAutoInvestment(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom = query.dateFrom || "Jan 1 2021";
        const dateTo = query.dateTo || `${Date()}`;
        const investment_category = String(query.investment_category) || "all";
        const reinvest = String(query.reinvest) || "all";
        let period = String(query.period) || "all"; // Set the period

        // Check the investment_category and add it to the search query object
        const filterInvestment = repoInvestmentCategory({
            investment_category: investment_category,
        });

        // Check the reinvest and add it to the search query object
        const filterReinvest = repoReinvest({
            reinvest: reinvest,
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        const filter = {
            is_auto_reinvested: true,
            ...timeFilter,
            ...searching,
            ...filterInvestment,
            ...filterReinvest,
        };

        // Get investment transactions from the database
        const investment_pipeline = [
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
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

            {
                $match: { "user.is_disabled": false },
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
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_category: 1,
                    reinvest: 1,
                    is_auto_reinvested: 1,
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    start_date: "$start_date",
                    amount_invested: format_query_decimal("$amount", 100),
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const investment = await this.findAggregate(investment_pipeline);

        // Get the total number of investments
        const invest_total = await this.findAggregate([
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
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

            {
                $match: { "user.is_disabled": false },
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
                $match: filter,
            },
        ]);

        const total = invest_total?.length;

        const pagination = repoPagination({ page, perpage, total: total! });

        // Return the data and pagination object
        return {
            data: investment,
            pagination,
        };
    }

    // This function finds an aggregate of Investment documents based on the query provided
    public async findAggregate(
        query: any
    ): Promise<IInvestmentDocument[] | null> {
        // Use the aggregate method from the Investment model to return the result
        return Investment.aggregate(query);
    }

    public async getAllExport(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        // Extract query and search parameters from the request
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all";

        const channel = String(query.channel) || "all"; // Set the channel
        const status = String(query.status) || "all";
        const payment_style = String(query.payment_style); // Set the payment_style
        const investment_category = String(query.investment_category) || "all"; // Set the investment_category
        const investment_type = String(query.investment_type) || "all";

        let payment_style_filter = {};
        let status_filter = {};

        const filterChannel = repoPaymentChannel({ channel: channel });

        // Check the investment_category and add it to the search query object
        const filterInvestment = repoInvestmentType({
            investment_type: investment_type,
        });

        // Check the investment_category and add it to the search query object
        const filterCategory = repoInvestmentCategory({
            investment_category: investment_category,
        });

        // Check status and add to the status filter
        if (status !== "undefined" && Object.keys(status).length > 0) {
            status_filter = { investment_status: status };
        }

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        // add the myDateFrom and myDateTo to the time filter object
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        const filter = {
            ...timeFilter,
            ...status_filter,
            ...searching,
            ...filterChannel,
            ...filterInvestment,
            ...filterCategory,
            ...payment_style_filter,
        };

        // create the investment query pipeline
        const invest_pipeline = [
            {
                $lookup: {
                    from: "plans",
                    localField: "plan",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: "$plan" },

            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },

            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },
            { $unwind: "$listing" },

            {
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    investment_category: 1,
                    investment_type: 1,
                    investment_status: 1,
                    duration: 1,
                    start_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    start_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    channel: "$transaction.payment_gateway",
                    payment_style: "$investment_occurrence",
                    amount_invested: format_query_decimal("$amount", 100),

                    no_tokens: format_query_decimal("$no_tokens", 100),

                    current_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $multiply: [
                                        "$amount",
                                        { $divide: ["$listing.returns", 100] },
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
                                                        "$listing.returns",
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

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: format_query_decimal(
                                            {
                                                $multiply: [
                                                    "$amount",
                                                    {
                                                        $divide: [
                                                            "$listing.returns",
                                                            100,
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
                                                                    "$listing.returns",
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

                    asset_balance: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $multiply: [
                                        "$amount",
                                        { $divide: ["$listing.returns", 100] },
                                    ],
                                },
                            ],
                        },
                        100
                    ),
                    maturity_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    maturity_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        // Execute the aggregate query and return the result
        return await this.findAggregate(invest_pipeline);
    }

    public async getAllAutoExport(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        // Extract query and search parameters from the request
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all";
        const investment_category = String(query.investment_category) || "all";
        const reinvest = String(query.reinvest) || "all";

        // Check the investment_category and add it to the search query object
        const filterInvestment = repoInvestmentCategory({
            investment_category: investment_category,
        });

        // Check the reinvest and add it to the search query object
        const filterReinvest = repoReinvest({
            reinvest: reinvest,
        });

        // add the myDateFrom and myDateTo to the time filter object
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        const filter = {
            is_auto_reinvested: true,
            ...timeFilter,
            ...searching,
            ...filterInvestment,
            ...filterReinvest,
        };

        // create the investment query pipeline
        const invest_pipeline = [
            {
                $lookup: {
                    from: "plans",
                    localField: "plan",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: "$plan" },

            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },
            { $unwind: "$listing" },

            {
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    investment_category: 1,
                    reinvest: 1,
                    is_auto_reinvested: 1,
                    start_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    start_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    amount_invested: format_query_decimal("$amount", 100),
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        // Execute the aggregate query and return the result
        return await this.findAggregate(invest_pipeline);
    }

    // Get all listing fixed Investments
    // This function is used to get all fixed investments for a given listing
    public async getAllListingFixedInvestments(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        const { listing_id } = req.params;
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let period = String(query.period) || "all"; // Set the period
        const channel = String(query.channel) || "all";
        const payment_style = String(query.payment_style);

        let filterQuery = {};
        let payment_style_filter = {};

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        const filterChannel = repoPaymentChannel({ channel: channel });

        if (search !== "undefined" && Object.keys(search).length > 0) {
            // Create a regex expression for the search query
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.middle_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                ],
            };
        }

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        const filter = {
            ...timeFilter,
            ...filterQuery,
            ...filterChannel,
            ...payment_style_filter,
        };

        // create the investment query pipeline
        const investment_pipeline = [
            {
                $match: {
                    listing_id: new Types.ObjectId(listing_id),
                    investment_category: IInvestmentCategory.FIXED,
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
            { $unwind: "$listing" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    listing_id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    investment_category: 1,
                    investment_status: 1,
                    payment_style: "$investment_occurrence",
                    start_date: "$start_date",
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    channel: { $ifNull: ["$transaction.payment_gateway", ""] },
                    amount_invested: format_query_decimal("$amount", 100),
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    returns: "$listing.fixed_returns",
                    payment_method: "$transaction.transaction_medium",

                    current_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
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
                                100
                            ),
                        },
                    },

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: format_query_decimal(
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

                    expected_payout: format_query_decimal(
                        {
                            $add: [
                                "$amount",
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
                        100
                    ),
                    maturity_date: "$end_date",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const investment: any = await this.findAggregate(investment_pipeline);
        // Get total investment documents
        const invest_total = await this.find({
            listing_id: listing_id,
            investment_category: IInvestmentCategory.FIXED,
            filter,
        });

        const total: number = invest_total?.length as number;

        // Create pagination object
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return the data and pagination object
        return { investment, pagination };
    }

    // Get all listing fixed Investments
    // This function is used to get all fixed investments for a given listing
    public async getAllListingFlexibleInvestments(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        const { listing_id } = req.params;
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let period = String(query.period) || "all"; // Set the period
        const channel = String(query.channel) || "all";
        const payment_style = String(query.payment_style);

        let filterQuery = {};
        let payment_style_filter = {};

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        const filterChannel = repoPaymentChannel({ channel: channel });

        if (search !== "undefined" && Object.keys(search).length > 0) {
            // Create a regex expression for the search query
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.middle_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                ],
            };
        }

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        const filter = {
            ...timeFilter,
            ...filterQuery,
            ...filterChannel,
            ...payment_style_filter,
        };

        // create the investment query pipeline
        const investment_pipeline = [
            {
                $match: {
                    listing_id: new Types.ObjectId(listing_id),
                    investment_category: IInvestmentCategory.FLEXIBLE,
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
            { $unwind: "$listing" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $match: filter,
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    listing_id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    investment_category: "$investment_category",
                    start_date: "$start_date",
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    cash_dividend: format_query_decimal("$cash_dividend", 100),
                    investment_status: 1,
                    returns: "$listing.flexible_returns",
                    channel: { $ifNull: ["$transaction.payment_gateway", ""] },
                    amount_invested: format_query_decimal("$amount", 100),
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    payment_method: "$transaction.transaction_medium",
                    payment_style: "$investment_occurrence",

                    current_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $multiply: [
                                        "$amount",
                                        {
                                            $divide: [
                                                "$listing.flexible_returns",
                                                100,
                                            ],
                                        },
                                    ],
                                },
                                100
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
                                                        {
                                                            $ifNull: [
                                                                "$last_dividends_date",
                                                                "$start_date",
                                                            ],
                                                        },
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
                                                        "$listing.flexible_returns",
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                100
                            ),
                        },
                    },

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: format_query_decimal(
                                            {
                                                $multiply: [
                                                    "$amount",
                                                    {
                                                        $divide: [
                                                            {
                                                                $ifNull: [
                                                                    "$listing.flexible_returns",
                                                                    0,
                                                                ],
                                                            },
                                                            100,
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
                                                                    {
                                                                        $ifNull:
                                                                            [
                                                                                "$last_dividends_date",
                                                                                "$start_date",
                                                                            ],
                                                                    },
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
                                                                                0,
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

                    expected_payout: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $multiply: [
                                        "$amount",
                                        {
                                            $divide: [
                                                {
                                                    $ifNull: [
                                                        "$listing.flexible_returns",
                                                        0,
                                                    ],
                                                },
                                                100,
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        100
                    ),
                    maturity_date: "$end_date",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const investment: any = await this.findAggregate(investment_pipeline);
        // Get total investment documents
        const invest_total = await this.find({
            listing_id: listing_id,
            investment_category: IInvestmentCategory.FLEXIBLE,
            filter,
        });

        const total: number = invest_total?.length as number;

        // Create pagination object
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return the data and pagination object
        return { investment, pagination };
    }

    // Get all User Investments
    // This function is used to get all investments for a given listing
    public async getAllUserInvestments(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        // Get the user_id from the request params
        const user_id = req.user?._id;
        // Get the query parameters from the request
        const { query } = req;
        // Convert the search parameter to string
        const search = String(query.search);
        // Convert the investment_status parameter to string
        const investment_status = String(query.investment_status);
        // Set the default perpage value to 10 if not provided in the query
        const perpage = Number(query.perpage) || 10;
        // Set the default page value to 1 if not provided in the query
        const page = Number(query.page) || 1;
        // Calculate the skip value based on the page and perpage values
        const skip = page * perpage - perpage;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        // Initialize an empty filterQuery object
        let filterQuery = {};
        // Initialize an empty status_filter object
        let status_filter = {};
        let period = String(query.period) || "";
        let timeFilter = {};
        let days;

        const { start, end } = await UtilFunctions.getTodayTime();
        const current_date = new Date();

        // Check if the search parameter is present and has some value
        if (search !== "undefined" && Object.keys(search).length > 0) {
            // If present, add the search criteria to the filterQuery object
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.middle_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                    { "transaction.payment_gateway": new RegExp(search, "i") },
                ],
            };
        }

        // Check if period is custom and set filter query accordingly
        if (period === "custom") {
            filterQuery = {
                createdAt: { $gte: myDateFrom, $lte: myDateTo },
            };
        } else if (period === "today") {
            timeFilter = { createdAt: { $gte: start, $lte: end } };
        } else if (period === "7days") {
            days = await UtilFunctions.subtractDays(7);
            timeFilter = {
                createdAt: { $gte: days, $lte: current_date },
            };
        } else if (period === "30days") {
            days = await UtilFunctions.subtractDays(30);
            timeFilter = {
                createdAt: { $gte: days, $lte: current_date },
            };
        } else if (period === "90days") {
            days = await UtilFunctions.subtractDays(90);
            timeFilter = {
                createdAt: { $gte: days, $lte: current_date },
            };
        }

        // Check if the investment_status parameter is present and has some value
        if (
            investment_status !== "undefined" &&
            Object.keys(investment_status).length > 0
        ) {
            // If present, check the value of the investment_status parameter
            if (investment_status == "all") {
                // If the value is 'all', set the status_filter object to an empty object
                status_filter = {};
            } else if (investment_status === "active") {
                // If the value is 'pending', set the status_filter object to active investment status
                status_filter = {
                    investment_status: IInvestmentStatus.INVESTMENT_ACTIVE,
                };
            } else {
                // If the value is anything other than 'all' or 'pending', set the status_filter object to completed investment status
                status_filter = {
                    investment_status: IInvestmentStatus.INVESTMENT_MATURED,
                };
            }
        }

        // Merge the filterQuery and status_filter objects into one filter object
        const filter = { ...filterQuery, ...status_filter, ...timeFilter };

        // Create an aggregate pipeline to get the investments
        const invest_pipeline = [
            { $match: { user_id: new Types.ObjectId(user_id) } },
            { $skip: skip },
            { $limit: perpage },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    let: { userId: "$user_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$userId"] },
                            },
                        },
                    ],
                    as: "user",
                },
            },
            {
                $lookup: {
                    from: "transactionrefs",
                    let: { userId: "$user_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$user_id", "$$userId"] },
                            },
                        },
                    ],
                    as: "transactionref",
                },
            },
            { $unwind: "$transactionref" },
            {
                $lookup: {
                    from: "transactions",
                    let: { transactionrefId: "$transactionref._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        "$transaction_ref",
                                        "$$transactionrefId",
                                    ],
                                },
                            },
                        },
                    ],
                    as: "transaction",
                },
            },
            { $unwind: "$user" },
            { $match: filter },
            {
                $project: {
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    profile_photo: "$user.profile_photo",
                    amount_invested: "$amount",
                    no_tokens: "$no_tokens",
                    start_date: "$start_date",
                    maturity_date: "$end_date",
                    payment_channel: "$transaction.payment_gateway",
                    status: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$investment_status",
                                    IInvestmentStatus.INVESTMENT_ACTIVE,
                                ],
                            },
                            then: "Active",
                            else: "Matured",
                        },
                    },
                    createdAt: 1,
                },
            },
        ];

        // Get the investments and total count of investments in parallel
        const [investment, total] = await Promise.all([
            this.findAggregate(invest_pipeline),
            Investment.countDocuments(filter),
        ]);

        // Create pagination object with the required details
        const pagination = {
            hasPrevious: page > 1,
            prevPage: page - 1,
            hasNext: page < Math.ceil(total / perpage),
            next: page + 1,
            currentPage: Number(page),
            total: total,
            pageSize: perpage,
            lastPage: Math.ceil(total / perpage),
        };

        // Return the investments and pagination object
        return {
            investment,
            pagination,
        };
    }

    // Get the count of investment documents
    public async countDocs(
        query: any
    ): Promise<IInvestmentDocument[] | null | any> {
        return Investment.countDocuments({ ...query });
    }

    // Export all listing fixed Investments
    // This function is used to export all fixed investments related to a particular listing
    public async exportAllListingFixedInvestments(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        // Get the listing_id from the request params
        const { listing_id } = req.params;
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all";
        const channel = String(query.channel) || "all";
        const payment_style = String(query.payment_style);

        let filterQuery = {}; // Initialize the filter query object
        let payment_style_filter = {};

        // add the myDateFrom and myDateTo to the time filter object
        const timeFilter = await repoTime({ period, dateFrom, dateTo });
        const filterChannel = repoPaymentChannel({ channel: channel });

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        // Check if search query is present and has valid length
        if (search !== "undefined" && Object.keys(search).length > 0) {
            // Create a regex expression for the search query
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.middle_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                ],
            };
        }

        // create the investment query pipeline
        const investment_pipeline = [
            {
                $match: { listing_id: new Types.ObjectId(listing_id) },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },
            { $unwind: "$listing" },

            {
                $match: {
                    ...timeFilter,
                    ...filterQuery,
                    ...filterChannel,
                    ...payment_style_filter,
                },
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    investment_category: "$investment_category",
                    payment_style: "$investment_occurrence",
                    returns: "$listing.fixed_returns",
                    start_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    start_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    channel: "$transaction.payment_gateway",
                    investment_status: 1,
                    amount_invested: format_query_decimal("$amount", 100),
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    payment_method: "$transaction.transaction_medium",

                    monthly_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
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
                                100
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
                                100
                            ),
                        },
                    },

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: format_query_decimal(
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

                    expected_payout: format_query_decimal(
                        {
                            $add: [
                                "$amount",
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
                        100
                    ),
                    maturity_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    maturity_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        const investment: any = await this.findAggregate(investment_pipeline);

        return investment;
    }

    // Export all listing fixed Investments
    // This function is used to export all fixed investments related to a particular listing
    public async exportAllListingFlexibleInvestments(
        req: ExpressRequest
    ): Promise<IInvestmentDocument[] | null | any> {
        // Get the listing_id from the request params
        const { listing_id } = req.params;
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all";
        const channel = String(query.channel) || "all";
        const payment_style = String(query.payment_style);

        let filterQuery = {}; // Initialize the filter query object
        let payment_style_filter = {};

        // add the myDateFrom and myDateTo to the time filter object
        const timeFilter = await repoTime({ period, dateFrom, dateTo });
        const filterChannel = repoPaymentChannel({ channel: channel });

        // Check status and add to the status filter
        if (
            payment_style !== "undefined" &&
            Object.keys(payment_style).length > 0
        ) {
            payment_style_filter = { investment_occurrence: payment_style };
        }

        // Check if search query is present and has valid length
        if (search !== "undefined" && Object.keys(search).length > 0) {
            // Create a regex expression for the search query
            filterQuery = {
                $or: [
                    { "user.first_name": new RegExp(search, "i") },
                    { "user.middle_name": new RegExp(search, "i") },
                    { "user.last_name": new RegExp(search, "i") },
                    { "user.email": new RegExp(search, "i") },
                ],
            };
        }

        // create the investment query pipeline
        const investment_pipeline = [
            {
                $match: {
                    listing_id: new Types.ObjectId(listing_id),
                    investment_category: IInvestmentCategory.FLEXIBLE,
                },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },
            { $unwind: "$listing" },

            {
                $match: {
                    ...timeFilter,
                    ...filterQuery,
                    ...filterChannel,
                    ...payment_style_filter,
                },
            },

            {
                $project: {
                    createdAt: 1,
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    asset_name: "$listing.project_name",
                    investment_category: "$investment_category",
                    payment_style: "$investment_occurrence",
                    start_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    start_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    fx_rate: {
                        $toDouble: {
                            $round: ["$transaction.exchange_rate_value", 2],
                        },
                    },
                    channel: "$transaction.payment_gateway",
                    amount_invested: format_query_decimal("$amount", 100),
                    no_tokens: format_query_decimal("$no_tokens", 100),
                    cash_dividend: format_query_decimal("$cash_dividend", 100),
                    investment_status: 1,
                    returns: "$listing.flexible_returns",
                    payment_method: "$transaction.transaction_medium",

                    current_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $multiply: [
                                        "$amount",
                                        {
                                            $divide: [
                                                "$listing.flexible_returns",
                                                100,
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
                                                        {
                                                            $ifNull: [
                                                                "$last_dividends_date",
                                                                "$start_date",
                                                            ],
                                                        },
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
                                                        "$listing.flexible_returns",
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                100
                            ),
                        },
                    },

                    expected_payout: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $multiply: [
                                        "$amount",
                                        {
                                            $divide: [
                                                "$listing.flexible_returns",
                                                100,
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        100
                    ),

                    maturity_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    maturity_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        const investment: any = await this.findAggregate(investment_pipeline);

        return investment;
    }

    public async investment_chart(
        user_id: Types.ObjectId
    ): Promise<IInvestmentDocument[] | null | any> {
        // Get the date range of the last 11 months
        const time_filter = getMonthsDate(
            moment().subtract(11, "month"),
            moment()
        );
        // Create an aggregation pipeline to query investments
        const invest_pipeline = [
            {
                $match: { user_id }, // Match investments by user_id
            },
            {
                $lookup: {
                    // Lookup listings associated with investments
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },

            { $unwind: "$listing" }, // Unwind listing array

            {
                $project: {
                    // Project start and end dates and returns
                    start_date: 1,
                    end_date: 1,
                    returns: {
                        $multiply: [
                            {
                                $multiply: [
                                    { $divide: ["$listing.returns", 100] },
                                    "$amount",
                                ],
                            },
                            {
                                $divide: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    new Date(),
                                                    "$start_date",
                                                ],
                                            },
                                            1000 * 60 * 60,
                                        ],
                                    },
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    "$end_date",
                                                    "$start_date",
                                                ],
                                            },
                                            1000 * 60 * 60,
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },

            {
                $group: {
                    // Group investments by month
                    _id: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$start_date",
                            },
                        },
                        returns: "$returns",
                    },
                    start_date: { $first: "$start_date" },
                    end_date: { $first: "$end_date" },
                },
            },

            {
                $group: {
                    // Group investments by month
                    _id: "$_id.date",
                    start_date: { $first: "$start_date" },
                    end_date: { $first: "$end_date" },
                    returns: { $sum: "$_id.returns" },
                },
            },

            {
                $sort: { _id: 1 }, // Sort investments by month
            },

            {
                $group: {
                    // Group investments into data array
                    _id: null,
                    data: {
                        $push: {
                            date: "$_id",
                            returns: format_query_decimal("$returns", 100),
                        },
                    },
                },
            },

            {
                $project: {
                    // Map data array to include all months in time filter
                    data: {
                        $map: {
                            input: time_filter,
                            as: "e",
                            in: {
                                $let: {
                                    vars: {
                                        dateIndex: {
                                            $indexOfArray: [
                                                "$data.date",
                                                "$$e",
                                            ],
                                        }, // Find index of date in data array
                                    },
                                    in: {
                                        $cond: {
                                            // If date is found, return date and value, else return 0
                                            if: { $ne: ["$$dateIndex", -1] },
                                            then: {
                                                date: "$$e",
                                                value: {
                                                    $round: [
                                                        {
                                                            $arrayElemAt: [
                                                                "$data.returns",
                                                                "$$dateIndex",
                                                            ],
                                                        },
                                                        4,
                                                    ],
                                                },
                                            },
                                            else: {
                                                date: "$$e",
                                                value: 0,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { $unwind: "$data" },

            {
                $project: {
                    // Project only data array
                    _id: 0,
                    date: "$data.date",
                    value: "$data.value",
                },
            },
        ];

        // Query investments using aggregation pipeline
        const investment = await this.findAggregate(invest_pipeline);

        return investment;
    }

    // public async listingTransactionCards() {
    //     const total_amount = await listingRepository.aggregate([
    //         {
    //             $match: {
    //                 listing_id: new Types.ObjectId(listing_id),
    //                 investment_category: IInvestmentCategory.FIXED,
    //             },
    //         },
    //         {
    //             $group: {
    //                 _id: null,
    //                 total_deposits: { $sum: "$amount" },
    //             },
    //         },
    //         {
    //             $project: {
    //                 _id: 0,
    //                 total_deposits: {
    //                     $toDouble: { $round: ["$total_deposits", 2] },
    //                 },
    //             },
    //         },
    //     ]);

    //     const total_amount_invested = await listingRepository.aggregate([
    //         {
    //             $match: {
    //                 transaction_medium: ITransactionMedium.WALLET,
    //                 transaction_type: ITransactionType.WITHDRAWAL,
    //             },
    //         },
    //         {
    //             $group: {
    //                 _id: null,
    //                 total_withdrawal: { $sum: "$amount" },
    //             },
    //         },
    //         {
    //             $project: {
    //                 _id: 0,
    //                 total_withdrawal: {
    //                     $toDouble: { $round: ["$total_withdrawal", 2] },
    //                 },
    //             },
    //         },
    //     ]);

    //     const fixed_returns = await listingRepository.aggregate([
    //         {
    //             $match: {
    //                 transaction_medium: ITransactionMedium.WALLET,
    //             },
    //         },
    //         {
    //             $group: {
    //                 _id: null,
    //                 total_balance: { $sum: "$wallet.wallet_balance_after" },
    //             },
    //         },
    //         {
    //             $project: {
    //                 _id: 0,
    //                 total_balance: {
    //                     $toDouble: { $round: ["$total_balance", 2] },
    //                 },
    //             },
    //         },
    //     ]);

    //     const flexible_returns = await listingRepository.aggregate([
    //         {
    //             $match: {
    //                 transaction_medium: ITransactionMedium.WALLET,
    //             },
    //         },
    //         {
    //             $group: {
    //                 _id: null,
    //                 total_balance: { $sum: "$wallet.wallet_balance_after" },
    //             },
    //         },
    //         {
    //             $project: {
    //                 _id: 0,
    //                 total_balance: {
    //                     $toDouble: { $round: ["$total_balance", 2] },
    //                 },
    //             },
    //         },
    //     ]);

    //     // Return data information
    //     return {
    //         total_account_balance:
    //             total_account_balance.length > 0
    //                 ? total_account_balance[0].total_balance
    //                 : 0,
    //         total_deposits:
    //             total_deposits.length > 0
    //                 ? total_deposits[0].total_deposits
    //                 : 0,
    //         total_withdrawals:
    //             total_withdrawals.length > 0
    //                 ? total_withdrawals[0].total_withdrawal
    //                 : 0,
    //     };
    // }

    public async investment_chart_ended(
        user_id: Types.ObjectId
    ): Promise<IInvestmentDocument[] | null | any> {
        // Get the date range of the last 11 months
        const time_filter = getMonthsDate(
            moment().subtract(11, "month"),
            moment()
        );
        // Create an aggregation pipeline to query investments
        const invest_pipeline = [
            {
                $match: {
                    user_id,
                    investment_status: IInvestmentStatus.INVESTMENT_MATURED,
                }, // Match investments by user_id
            },
            {
                $lookup: {
                    // Lookup listings associated with investments
                    from: "listings",
                    localField: "listing_id",
                    foreignField: "_id",
                    as: "listing",
                },
            },

            { $unwind: "$listing" }, // Unwind listing array

            {
                $project: {
                    // Project start and end dates and returns
                    start_date: 1,
                    end_date: 1,
                    returns: format_query_decimal(
                        {
                            $multiply: [
                                {
                                    $multiply: [
                                        { $divide: ["$listing.returns", 100] },
                                        "$amount",
                                    ],
                                },
                                {
                                    $divide: [
                                        {
                                            $divide: [
                                                {
                                                    $subtract: [
                                                        new Date(),
                                                        "$start_date",
                                                    ],
                                                },
                                                1000 * 60 * 60,
                                            ],
                                        },
                                        {
                                            $divide: [
                                                {
                                                    $subtract: [
                                                        "$end_date",
                                                        "$start_date",
                                                    ],
                                                },
                                                1000 * 60 * 60,
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

            {
                $group: {
                    // Group investments by month
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$start_date" },
                    },
                    start_date: { $first: "$start_date" },
                    end_date: { $first: "$end_date" },
                    returns: { $sum: "$returns" },
                },
            },

            {
                $sort: { _id: 1 }, // Sort investments by month
            },

            {
                $group: {
                    // Group investments into data array
                    _id: null,
                    data: {
                        $push: {
                            date: "$_id",
                            returns: { $toDouble: "$returns" },
                        },
                    },
                },
            },

            {
                $project: {
                    // Map data array to include all months in time filter
                    data: {
                        $map: {
                            input: time_filter,
                            as: "e",
                            in: {
                                $let: {
                                    vars: {
                                        dateIndex: {
                                            $indexOfArray: [
                                                "$data.date",
                                                "$$e",
                                            ],
                                        }, // Find index of date in data array
                                    },
                                    in: {
                                        $cond: {
                                            // If date is found, return date and value, else return 0
                                            if: { $ne: ["$$dateIndex", -1] },
                                            then: {
                                                date: "$$e",
                                                value: {
                                                    $round: [
                                                        {
                                                            $arrayElemAt: [
                                                                "$data.returns",
                                                                "$$dateIndex",
                                                            ],
                                                        },
                                                        4,
                                                    ],
                                                },
                                            },
                                            else: {
                                                date: "$$e",
                                                value: 0,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { $unwind: "$data" },

            {
                $project: {
                    // Project only data array
                    _id: 0,
                    date: "$data.date",
                    value: "$data.value",
                },
            },
        ];

        // Query investments using aggregation pipeline
        const investment = await this.findAggregate(invest_pipeline);

        // Return investment data
        return investment;
    }

    // Get all Investments - no pagination
    // This function is used to get all user investments using user_id, plan_id
    public async findV5NoPagination(
        req: ExpressRequest,
        user_id: any,
        plan_id: any,
        investment_category: any
    ): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // add the plan_id, user_id, myDateFrom and myDateTo to the time filter object
        const filterQuery = {
            ...timeFilter,
            plan: plan_id,
            user_id: user_id,
        };

        let plan_pipeline;
        if (investment_category === IInvestmentCategory.FIXED) {
            plan_pipeline = repoExportPlanFixedPipeline({ filterQuery });
        }

        // Execute the aggregate query
        const investment = await this.findAggregate(plan_pipeline);

        // Return investment data
        return investment;
    }

    // Get all Investments
    // This function is used to get all user investments using user_id, plan_id
    public async findV5(
        req: ExpressRequest,
        user_id: any,
        plan_id: any,
        investment_category: any
    ): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const channel = String(query.channel) || "all"; // Set the channel
        const payment_method = String(query.payment_method) || "all"; // Set the payment_method
        const search = String(query.search); // Set the search
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
        const myDateTo = convertDate(dateTo); // Convert the date to a valid format
        const skip = page * perpage - perpage; // Calculates the skip page number using the page and perpage number

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["name_of_asset"],
        });

        // Check the payment_channel and add it to the search query object
        const filterChannel = repoTransactionPaymentChannel({
            channel: channel,
        });

        // Check the payment_medium and add it to the search query object
        const filterMethod = repoTransactionPaymentMethod({
            payment_method: payment_method,
        });

        // add the plan_id, user_id, myDateFrom and myDateTo to the time filter object
        const filterQuery = {
            createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
            plan: plan_id,
            user_id: user_id,
            ...searching,
            ...filterChannel,
            ...filterMethod,
        };

        const plan_pipeline = [
            {
                $match: filterQuery,
            },
            { $skip: skip },
            { $limit: perpage },
            {
                $sort: {
                    createdAt: -1,
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
                $sort: {
                    createdAt: -1,
                },
            },

            {
                $project: {
                    _id: 1,
                    plan_name: "$plan.plan_name",
                    name_of_asset: "$listing.project_name",
                    amount_invested: format_query_decimal("$amount", 100),
                    current_returns: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: ["$listing._id", "$listing_id"] },
                                    {
                                        $eq: [
                                            "$investment_status",
                                            IInvestmentStatus.INVESTMENT_MATURED,
                                        ],
                                    },
                                ],
                            },
                            then: format_query_decimal(
                                {
                                    $cond: {
                                        if: {
                                            $eq: [
                                                "$investment_category",
                                                IInvestmentCategory.FIXED,
                                            ],
                                        },
                                        then: format_query_decimal(
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
                                            100
                                        ),
                                        else: format_query_decimal(
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
                                            100
                                        ),
                                    },
                                },
                                100
                            ),

                            else: format_query_decimal(
                                {
                                    $cond: {
                                        if: {
                                            $eq: [
                                                "$investment_category",
                                                IInvestmentCategory.FIXED,
                                            ],
                                        },
                                        then: format_query_decimal(
                                            {
                                                $divide: [
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
                                                    "$duration",
                                                ],
                                            },
                                            1000
                                        ),
                                        else: format_query_decimal(
                                            {
                                                $divide: [
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
                                                    "$duration",
                                                ],
                                            },
                                            1000
                                        ),
                                    },
                                },
                                1000
                            ),
                        },
                    },

                    current_value: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $cond: {
                                        if: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$listing._id",
                                                        "$listing_id",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$investment_status",
                                                        IInvestmentStatus.INVESTMENT_MATURED,
                                                    ],
                                                },
                                            ],
                                        },
                                        then: format_query_decimal(
                                            {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            "$investment_category",
                                                            IInvestmentCategory.FIXED,
                                                        ],
                                                    },
                                                    then: format_query_decimal(
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
                                                        100
                                                    ),
                                                    else: format_query_decimal(
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
                                                        1000
                                                    ),
                                                },
                                            },
                                            100
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
                                                                    "$listing.returns",
                                                                    100,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            100
                                        ),
                                    },
                                },
                            ],
                        },
                        100
                    ),

                    expected_payout: format_query_decimal(
                        {
                            $add: [
                                "$amount",
                                {
                                    $multiply: [
                                        "$amount",
                                        { $divide: ["$listing.returns", 100] },
                                    ],
                                },
                            ],
                        },
                        100
                    ),

                    start_date: 1,
                    maturity_date: "$end_date",
                    currency: "$investment_currency",
                    createdAt: 1,
                },
            },
        ];

        const investment = await this.findAggregate(plan_pipeline);

        const total = await this.countDocs(filterQuery);

        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return { data: investment, pagination };
    }

    public async getPlans(
        user_id: Types.ObjectId
    ): Promise<IInvestmentDocument[] | null | any> {
        const plan_pipeline = [
            {
                $match: {
                    user_id: new Types.ObjectId(user_id),
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
                $sort: {
                    createdAt: -1,
                },
            },

            {
                $project: {
                    _id: 1,
                    plan: 1,
                    plan_name: "$plan.plan_name",
                    amount_invested: { $toDouble: "$amount" },
                    plan_currency: "$plan.currency",
                    current_value: {
                        $add: [
                            "$amount",

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
                        ],
                    },
                },
            },

            {
                $group: {
                    _id: "$plan",
                    plan_name: { $first: "$plan_name" },
                    amount_invested: { $sum: "$amount_invested" },
                    current_value: { $sum: "$current_value" },
                },
            },

            {
                $project: {
                    _id: "$_id._id",
                    plan_name: 1,
                    amount_invested: format_query_decimal(
                        "$amount_invested",
                        100
                    ),
                    current_value: format_query_decimal("$current_value", 100),
                },
            },
        ];

        return Promise.resolve(await this.findAggregate(plan_pipeline));
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * PAYMENT STYLE
     */
    public async findPaymentStylePaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const payment_style = String(query.payment_style); // Set the payment style
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; // calculate and set the page skip number
        let paymentStyleQuery = {}; // Initialize the payment style query object

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check if there is a payment style and add it to the payment style query object
        if (payment_style == IPortfolioOccurrence.All) {
            paymentStyleQuery = {};
        } else {
            paymentStyleQuery = { investment_occurrence: payment_style };
        }

        const filter = { ...paymentStyleQuery, ...searching };

        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $match: filter },
            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
        ];

        const [payment_style_stats] = await Promise.all([
            this.findAggregate(payment_style_pipeline),
        ]);

        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return {
            data: payment_style_stats,
            pagination,
        };
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * INVESTMENT CATEGORY
     */
    public async findInvestmentCategoryPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const investment_category = String(query.investment_category); // Set the payment style
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; // calculate and set the page skip number

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check if there is a payment style and add it to the payment style query object
        const investment_filter = repoInvestmentCategory({
            investment_category: investment_category,
        });

        const filter = { ...searching, ...investment_filter };

        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            { $match: filter },

            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    middle_name: "$user.middle_name",
                    email: "$user.email",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    payment_method: {
                        $ifNull: ["$transaction.transaction_medium", ""],
                    },
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
        ];

        const [payment_style_stats] = await Promise.all([
            this.findAggregate(payment_style_pipeline),
        ]);

        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return {
            data: payment_style_stats,
            pagination,
        };
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * PAYMENT Method
     */
    public async findPaymentMethodPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const payment_method = String(query.payment_method); // Set the payment method
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; // calculate and set the page skip number

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check if there is a payment method and add it to the payment style query object
        const payment_filter = repoPaymentMethod({
            payment_method: payment_method,
        });

        const filter = { ...searching, ...payment_filter };

        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            { $match: filter },
            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    profile_photo: "$user.profile_photo",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    payment_method: {
                        $ifNull: ["$transaction.transaction_medium", ""],
                    },
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
        ];

        const [payment_style_stats] = await Promise.all([
            this.findAggregate(payment_style_pipeline),
        ]);

        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return {
            data: payment_style_stats,
            pagination,
        };
    }

    /************************
     ************************
     *
     *
     *
     * EXPORT PAYMENT STYLE
     */

    public async exportPaymentStyle({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const payment_style = String(query.payment_style); // Set the payment style
        let period = String(query.period) || "all"; // Set the period
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let paymentStyleQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check if there is a payment style and add it to the payment style query object
        if (payment_style == IPortfolioOccurrence.All) {
            paymentStyleQuery = {};
        } else {
            paymentStyleQuery = { investment_occurrence: payment_style };
        }

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        const filter = { ...paymentStyleQuery, ...timeFilter, ...searching };
        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $match: filter },

            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    middle_name: "$user.middle_name",
                    email: "$user.email",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
        ];

        const payment_style_stats = this.findAggregate(payment_style_pipeline);

        // Return plan information
        return payment_style_stats;
    }

    /************************
     ************************
     *
     *
     *
     * EXPORT PAYMENT METHOD
     */

    public async exportPaymentMethod({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const payment_method = String(query.payment_method); // Set the payment method
        let period = String(query.period) || "all"; // Set the period
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a payment method and add it to the payment style query object
        const payment_filter = repoPaymentMethod({
            payment_method: payment_method,
        });

        const filter = { ...timeFilter, ...searching, ...payment_filter };
        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            { $match: filter },

            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    middle_name: "$user.middle_name",
                    email: "$user.email",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    payment_method: {
                        $ifNull: ["$transaction.transaction_medium", ""],
                    },
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
        ];

        const payment_style_stats = this.findAggregate(payment_style_pipeline);

        // Return plan information
        return payment_style_stats;
    }

    /************************
     ************************
     * EXPORT INVESTMENT CATEGORY
     */

    public async exportInvestmentCategory({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IInvestmentDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const investment_category = String(query.investment_category);
        let period = String(query.period) || "90days";
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;

        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a payment style and add it to the payment style query object
        const investment_filter = repoInvestmentCategory({
            investment_category: investment_category,
        });

        const filter = { ...timeFilter, ...searching, ...investment_filter };

        // Get the plan documents from the database
        const payment_style_pipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "_id",
                    as: "transaction",
                },
            },
            { $unwind: "$transaction" },
            { $match: filter },

            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    middle_name: "$user.middle_name",
                    email: "$user.email",
                    investment_occurrence: 1,
                    investment_category: 1,
                    amount: format_query_decimal("$amount", 100),
                    payment_method: {
                        $ifNull: ["$transaction.transaction_medium", ""],
                    },
                    createdAt: 1,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
        ];

        const payment_style_stats = this.findAggregate(payment_style_pipeline);

        // Return plan information
        return payment_style_stats;
    }
}

export default new InvestmentRepository();
