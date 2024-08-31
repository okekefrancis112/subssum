import { FilterQuery, Types, UpdateQuery } from "mongoose";
import { IListingDocument } from "../interfaces/listing.interface";
import { Listing } from "../models";
import { repoPagination, repoSearch, repoTime } from "../util";
import { ExpressRequest } from "../server";

class ListingRepository {
    // Create a new Listing
    public async createNew({
        time,
        project_name,
        description,
        slug,
        fixed_returns,
        fixed_range,
        flexible_returns,
        flexible_range,
        project_image,
        minimum_amount,
        total_amount,
        location,
        holding_period,
        available_tokens,
        audience,
        status,
        created_by,
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
        neighborhood_attraction_1_image,
        neighborhood_attraction_2,
        neighborhood_attraction_2_image,
        neighborhood_attraction_3,
        neighborhood_attraction_3_image,
        neighborhood_attraction_4,
        neighborhood_attraction_4_image,
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
    }: {
        project_name: string;
        description: string;
        slug: string;
        fixed_returns: number;
        fixed_range: string;
        flexible_returns: number;
        flexible_range: string;
        project_image?: string;
        time?: number;
        minimum_amount: number;
        total_amount: number;
        location: string;
        holding_period: number;
        available_tokens: number;
        audience: string;
        parties_involved: string;
        status: string;
        returns: string;
        roi_range: string;
        strategy: string;
        created_by: Types.ObjectId;
        asset_type: string;
        map_url: string;
        capital_appreciation?: string;
        avg_amount_rental: string;
        avg_amount_appreciation: string;
        avg_occupancy_rate: string;
        neighborhood_attraction_1?: string;
        neighborhood_attraction_1_image?: string;
        neighborhood_attraction_2?: string;
        neighborhood_attraction_2_image?: string;
        neighborhood_attraction_3?: string;
        neighborhood_attraction_3_image?: string;
        neighborhood_attraction_4?: string;
        neighborhood_attraction_4_image?: string;
        question_1?: string;
        answer_1?: string;
        question_2?: string;
        answer_2?: string;
        question_3?: string;
        answer_3?: string;
        question_4?: string;
        answer_4?: string;
        question_5?: string;
        answer_5?: string;
        question_6?: string;
        answer_6?: string;
    }): Promise<IListingDocument> {
        const data = {
            time,
            project_name,
            description,
            slug,
            fixed_returns,
            fixed_range,
            flexible_returns,
            flexible_range,
            project_image,
            minimum_amount,
            total_amount,
            location,
            holding_period,
            available_tokens,
            audience,
            created_by,
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
            neighborhood_attraction_1_image,
            neighborhood_attraction_2,
            neighborhood_attraction_2_image,
            neighborhood_attraction_3,
            neighborhood_attraction_3_image,
            neighborhood_attraction_4,
            neighborhood_attraction_4_image,
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
        };

        return await Listing.create(data);
    }

    // Create a new Listing
    public async create({
        project_name,
        slug,
        project_image,
        minimum_amount,
        total_amount,
        description,
        location,
        holding_period,
        available_tokens,
        audience,
        status,
        created_by,
        parties_involved,
        returns,
        roi_range,
        strategy,
    }: {
        project_name: string;
        slug: string;
        project_image?: string;
        description: string;
        minimum_amount: number;
        total_amount: number;
        location: string;
        holding_period: number;
        available_tokens: number;
        audience: string;
        parties_involved: string;
        status: string;
        returns: string;
        roi_range: string;
        strategy: string;
        created_by: Types.ObjectId;
    }): Promise<IListingDocument> {
        const data = {
            project_name,
            slug,
            project_image,
            description,
            minimum_amount,
            total_amount,
            location,
            holding_period,
            available_tokens,
            audience,
            created_by,
            status,
            parties_involved,
            returns,
            roi_range,
            strategy,
        };

        return await Listing.create(data);
    }

    // Count the number of documents using the query object provided
    public async countDocs(query: FilterQuery<{}>): Promise<number | null> {
        return Listing.countDocuments(query);
    }

    // Count the number of documents using the query object provided
    public async findAll(
        query: FilterQuery<IListingDocument>
    ): Promise<IListingDocument[] | null> {
        return Listing.find(query);
    }

    // Get the oldest active listing using the query object provided
    public async getOneOldestActiveListing(
        query: FilterQuery<IListingDocument>
    ): Promise<IListingDocument | null> {
        return Listing.findOne(query).sort({ createdAt: 1 }).limit(1);
    }

    // Get listing using the query object provided
    public async getOne(
        query: FilterQuery<IListingDocument>
    ): Promise<IListingDocument | null> {
        return Listing.findOne(query);
    }

    // Get listing using the listing id provided
    public async getById(
        listing_id: Types.ObjectId
    ): Promise<IListingDocument | null> {
        return Listing.findById(listing_id);
    }

    // Get listing using the query object provided (Landing page)
    public async getOneLanding(
        query: FilterQuery<IListingDocument>
    ): Promise<IListingDocument | null> {
        return Listing.findOne(query).select(
            "project_name project_image description minimum_amount location status parties_involved strategy audience holding_period returns activities createdAt"
        );
    }

    // Get listing return of investment
    public async getROI(): Promise<IListingDocument[] | null> {
        return Listing.find().select("holding_period returns roi_range");
    }

    // Update listing using the listing_id and record object provided
    public async atomicUpdate(
        query: FilterQuery<IListingDocument>,
        record: UpdateQuery<IListingDocument>,
        session: any = null
    ) {
        return Listing.findOneAndUpdate(
            query,
            { ...record },
            { new: true, session }
        );
    }

    // Get listing aggregate using the query object provided
    public async findAggregate(
        query: any
    ): Promise<IListingDocument[] | null | any> {
        return Listing.aggregate(query);
    }

    // Update Listing Activity using the listing_id, act_id and record object provided
    public async updateActivity(
        listing_id: Types.ObjectId,
        act_id: Types.ObjectId,
        record: UpdateQuery<IListingDocument>,
        session: any = null
    ) {
        return Listing.findOneAndUpdate(
            { _id: listing_id, "activities._id": act_id },
            { ...record },
            { new: true, session }
        );
    }

    // Update Listing FAQ using the listing_id,faq_id and record object provided
    public async updateFaq(
        listing_id: Types.ObjectId,
        faq_id: Types.ObjectId,
        record: UpdateQuery<IListingDocument>,
        session: any = null
    ) {
        return Listing.findOneAndUpdate(
            { _id: listing_id, "faqs._id": faq_id },
            { ...record },
            { new: true, session }
        );
    }

    // Update listing using the listing_id, insight_id and record object provided
    public async updateAssetInsight(
        listing_id: Types.ObjectId,
        insight_id: Types.ObjectId,
        record: UpdateQuery<IListingDocument>,
        session: any = null
    ) {
        return Listing.findOneAndUpdate(
            { _id: listing_id, "asset_insights._id": insight_id },
            { ...record },
            { new: true, session }
        );
    }

    // Get all Listings (Admin)
    public async getAll(
        req: ExpressRequest
    ): Promise<IListingDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search) || ""; // Set the string for searching
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; // calculate and set the page skip number
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period for filtering

        let filterQuery = {}; // Initialize the filter query object

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["project_name", "status"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Add timeFilter, filterQuery to the filter object
        const filter = { ...filterQuery, ...timeFilter, ...searching };

        // Get the listings documents from the database
        const listings = await this.findAggregate([
            {
                $match: filter,
            },
            {
                $addFields: {
                    activeSort: {
                        $cond: [{ $eq: ["$status", "active"] }, 0, 1],
                    },
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    project_name: 1,
                    location: 1,
                    status: 1,
                    fixed_returns: 1,
                    flexible_returns: 1,
                    currency: 1,
                    total_investment_amount: {
                        $toDouble: { $round: ["$total_investment_amount", 2] },
                    },
                    createdAt: 1,
                    investors: { $size: "$investors" },
                },
            },
            { $skip: skip },
            { $limit: perpage },
        ]);

        const total = await this.countDocs(filter);

        const pagination = repoPagination({ page, perpage, total: total! }); // Get the pagination information

        // Return data and pagination information
        return {
            listings,
            pagination,
        };
    }

    public async listingTransactionCards(
        req: ExpressRequest
    ): Promise<IListingDocument[] | null | any> {
        const { listing_id } = req.params;
        const total_amount = await this.findAggregate([
            {
                $match: {
                    _id: new Types.ObjectId(listing_id),
                },
            },
            {
                $project: {
                    _id: 0,
                    total_amount: {
                        $toDouble: { $round: ["$total_amount", 2] },
                    },
                },
            },
        ]);

        const total_amount_invested = await this.findAggregate([
            {
                $match: {
                    _id: new Types.ObjectId(listing_id),
                },
            },
            {
                $project: {
                    _id: 0,
                    total_amount_invested: {
                        $toDouble: { $round: ["$total_investment_amount", 2] },
                    },
                },
            },
        ]);

        const fixed_returns = await this.findAggregate([
            {
                $match: {
                    _id: new Types.ObjectId(listing_id),
                },
            },
            {
                $project: {
                    _id: 0,
                    fixed_returns: 1,
                },
            },
        ]);

        const flexible_returns = await this.findAggregate([
            {
                $match: {
                    _id: new Types.ObjectId(listing_id),
                },
            },
            {
                $project: {
                    _id: 0,
                    flexible_returns: 1,
                },
            },
        ]);

        // Return data information
        return {
            total_amount:
                total_amount.length > 0 ? total_amount[0].total_amount : 0,
            total_amount_invested:
                total_amount_invested.length > 0
                    ? total_amount_invested[0].total_amount_invested
                    : 0,
            fixed_returns:
                fixed_returns.length > 0 ? fixed_returns[0].fixed_returns : 0,
            flexible_returns:
                flexible_returns.length > 0
                    ? flexible_returns[0].flexible_returns
                    : 0,
        };
    }

    // Get all Listings (Landing)
    public async getAllListingsLanding(
        req: ExpressRequest
    ): Promise<IListingDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search) || ""; // Set the string for searching
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period
        let filterQuery = {}; // Initialize the filter query object

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["project_name", "status"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Add timeFilter and filterQuery to the filter object
        const filter = { ...filterQuery, ...timeFilter, ...searching };

        // Get listings and total documents from the database
        const [listings, total] = await Promise.all([
            Listing.find(filter)
                // .select(
                //   'project_name project_image description minimum_amount location status returns currency createdAt'
                // )
                .lean(true)
                .sort({ createdAt: -1 })
                .limit(perpage)
                .skip(page * perpage - perpage),
            Listing.aggregate([{ $match: filter }, { $count: "count" }]),
        ]);

        const pagination = repoPagination({
            page,
            perpage,
            total: total[0]?.count!,
        });

        // Return data and pagination information
        return {
            listings,
            pagination,
        };
    }

    // Delete listing by listing_id
    public async deleteListing(
        listing_id: Types.ObjectId
    ): Promise<IListingDocument | null | any> {
        return Listing.findByIdAndDelete({ _id: listing_id });
    }
}

// Export ListingRepository
export default new ListingRepository();
