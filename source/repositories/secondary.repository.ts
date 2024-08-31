import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { Secondary } from "../models";
import { ISecondaryDocument } from "../interfaces/secondary.interface";
import { IInvestmentDocument } from "../interfaces/investment.interface";
import { ExpressRequest } from "../server";
import { repoInvestmentCategory, repoReinvest, repoTime, repoSearch, format_query_decimal, repoPagination } from "../util";

class ISecondaryRepository {
    public async create({
        amount,
        original_amount,
        charge,
        reason,
        wallet,
        investment_id,
        user_id,
        transaction_id,
        listing_id,
        plan_id,
        session,
    }: {
        amount: number;
        original_amount?: number;
        charge?: number;
        reason?: string;
        wallet: any;
        user_id: Types.ObjectId;
        investment_id: Types.ObjectId;
        transaction_id: Types.ObjectId;
        listing_id: Types.ObjectId;
        plan_id: Types.ObjectId;
        session: any;
    }): Promise<ISecondaryDocument[] | null> {
        const data = {
            amount: amount,
            original_amount: original_amount,
            charge: charge,
            reason: reason,
            user_id: user_id,
            wallet: {
                wallet_balance_before: wallet.wallet_balance_before,
                wallet_balance_after: wallet.wallet_balance_after,
            },
            investment_id: investment_id,
            transaction_id: transaction_id,
            listing_id: listing_id,
            plan_id: plan_id,
        };

        const invest = await Secondary.create([data], { session });

        return invest;
    }

    public async getOne(
        query: FilterQuery<ISecondaryDocument>,
        populate: string = ""
    ): Promise<ISecondaryDocument | null> {
        return Secondary.findOne(query).populate(populate).lean(true);
    }

    public async atomicUpdate(
        query: FilterQuery<ISecondaryDocument>,
        record: UpdateQuery<ISecondaryDocument>,
        session: any = null
    ): Promise<ISecondaryDocument | null> {
        return Secondary.findOneAndUpdate(query, record, {
            session,
            new: true,
        });
    }

    // This function finds an aggregate of Secondary Investment documents based on the query provided
    public async findAggregate(
        query: any
    ): Promise<ISecondaryDocument[] | null> {
        // Use the aggregate method from the Secondary Investment model to return the result
        return Secondary.aggregate(query);
    }

    // Gets all Secondary Investments
    public async getSecondaryInvestments(
        req: ExpressRequest
    ): Promise<ISecondaryDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom = query.dateFrom || "Jan 1 2021";
        const dateTo = query.dateTo || `${Date()}`;
        const reason = String(query.reason) || "all";
        let period = String(query.period) || "all"; // Set the period

        let reason_filter = {};

        // Check status and add to the status filter
        if (
            reason !== "undefined" &&
            Object.keys(reason).length > 0
        ) {
            reason_filter = { reason: reason };
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
            ...reason_filter
        };

        // Get investment transactions from the database
        const investment_pipeline = [
            {
                $lookup: {
                    from: "investments",
                    localField: "investment_id",
                    foreignField: "_id",
                    as: "investment",
                },
            },
            {
                $unwind: {
                    path: "$investment",
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
                $lookup: {
                    from: "plans",
                    localField: "plan_id",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
            {
                $match: filter,
            },
            {
                $project: {
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_category: "$investment.investment_category",
                    investment_amount:format_query_decimal("$investment.amount", 100),
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    charge: format_query_decimal("$charge", 100),
                    reason: 1,
                    listing_id: 1,
                    payout_amount: format_query_decimal("$amount", 100),
                    createdAt: 1,
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
                    localField: "plan_id",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "investments",
                    localField: "investment_id",
                    foreignField: "_id",
                    as: "investment",
                },
            },
            {
                $unwind: {
                    path: "$investment",
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

    // Gets single Secondary Investment
    public async getSingleSecondaryInvestment(
        req: ExpressRequest
    ): Promise<ISecondaryDocument[] | null | any> {
        const { secondary_id } = req.params;

        // Get single secondary investment from the database
        const investment_pipeline = [
            {
                $match: {
                    _id: new Types.ObjectId(secondary_id),
                },
            },
            {
                $lookup: {
                    from: "investments",
                    localField: "investment_id",
                    foreignField: "_id",
                    as: "investment",
                },
            },
            {
                $unwind: {
                    path: "$investment",
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
                $lookup: {
                    from: "plans",
                    localField: "plan_id",
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
            { $unwind: { path: "$transaction", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_category: "$investment.investment_category",
                    investment_amount: format_query_decimal("$investment.amount", 100),
                    dividend_preference: "$investment.investment_category",
                    maturity_date: "$investment.end_date",
                    portfolio_type: "$investment.investment_type",
                    cash_dividends: format_query_decimal("$investment.cash_dividend", 100),
                    fx_rate: format_query_decimal("$transaction.exchange_rate_value", 100),
                    status: "$transaction.transaction_status",
                    asset_name: "$listing.project_name",
                    duration: "$listing.holding_period",
                    portfolio_name: "$plan.plan_name",
                    charge: format_query_decimal("$charge", 100),
                    reason: 1,
                    payout_amount: format_query_decimal("$amount", 100),
                    createdAt: 1,
                },
            },
        ];

        const investment = await this.findAggregate(investment_pipeline);

        // Return the data object
        return investment
    }

    public async getExport(
        req: ExpressRequest
    ): Promise<ISecondaryDocument[] | null | any> {
        // Extract query and search parameters from the request
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all";
        const reason = String(query.reason) || "all";

        let reason_filter = {};

        // Check status and add to the status filter
        if (
            reason !== "undefined" &&
            Object.keys(reason).length > 0
        ) {
            reason_filter = { reason: reason };
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
            ...searching,
            ...reason_filter
        };

        // create the investment query pipeline
        const invest_pipeline = [
            {
                $lookup: {
                    from: "investments",
                    localField: "investment_id",
                    foreignField: "_id",
                    as: "investment",
                },
            },
            {
                $unwind: {
                    path: "$investment",
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
                $lookup: {
                    from: "plans",
                    localField: "plan_id",
                    foreignField: "_id",
                    as: "plan",
                },
            },
            { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
            {
                $match: filter,
            },
            {
                $project: {
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    investment_category: "$investment.investment_category",
                    investment_amount:format_query_decimal("$investment.amount", 100),
                    asset_name: "$listing.project_name",
                    plan_name: "$plan.plan_name",
                    charge: format_query_decimal("$charge", 100),
                    reason: 1,
                    payout_amount: format_query_decimal("$amount", 100),
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        // Execute the aggregate query and return the result
        return await this.findAggregate(invest_pipeline);
    }

}

export default new ISecondaryRepository();
