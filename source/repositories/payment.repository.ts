import { Types, FilterQuery } from "mongoose";
import {
    IPaymentDocument,
} from "../interfaces/payment.interface";
import { Payment } from "../models";
import {
    convertDate,
} from "../util";
import { ExpressRequest } from "../server";

class PaymentRepository {
    // Function to create payment
    public async create({
        investment_category,
        user_id,
        no_tokens,
        listing_id,
        total_amount,
        payment_name,
        goal_name,
        goal_target,
        intervals,
        amount,
        payment_occurrence,
        duration,
        end_date,
        start_date,
        payment_category,
        next_charge_date,
        last_charge_date,
        session,
    }: {
        investment_category?: string;
        user_id?: Types.ObjectId;
        no_tokens?: number;
        listing_id?: Types.ObjectId;
        total_amount: number;
        payment_name?: string;
        goal_name?: string;
        goal_target?: number;
        intervals?: string;
        amount: number;
        payment_occurrence: string;
        duration: number;
        end_date: Date;
        start_date: Date;
        payment_category: string;
        next_charge_date: Date | null;
        last_charge_date?: Date | null;
        session: any;
    }): Promise<IPaymentDocument[]> {
        const data = {
            investment_category,
            user_id,
            no_tokens,
            listing_id,
            total_amount,
            payment_name,
            goal_name,
            goal_target,
            intervals,
            amount,
            payment_occurrence,
            duration,
            end_date,
            start_date,
            payment_category,
            next_charge_date,
            last_charge_date,
        };

        const payment = await Payment.create([data], { session });

        return payment;
    }

    // Function to get payment based on the query object provided
    public async getOne(
        query: FilterQuery<IPaymentDocument>
    ): Promise<IPaymentDocument | null> {
        return Payment.findOne(query);
    }

    // Function to get all payment based on the query object provided
    public async getAll(
        query: FilterQuery<IPaymentDocument>
    ): Promise<IPaymentDocument[] | null | any> {
        return Payment.find(query).exec() as Promise<IPaymentDocument[]>;
    }

    // Function to update payment based on the payment_id and record object provided
    public async atomicUpdate(
        payment_id: Types.ObjectId,
        record: any,
        session: any = null
    ) {
        return Payment.findOneAndUpdate(
            { _id: payment_id },
            { ...record },
            { new: true, session }
        );
    }

    // Function to get all payments
    public async find(
        req: ExpressRequest,
        user_id: any
    ): Promise<IPaymentDocument | null | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);

        // Add createdAt, user_id to the filter query object
        const filterQuery = {
            createdAt: { $gte: myDateFrom, $lte: myDateTo },
            user_id: user_id,
        };

        // Get the payment documents from the database
        const payment = await Payment.find(filterQuery)
            .limit(perpage)
            .skip(page * perpage - perpage);

        // Get total of payment documents
        const total = await Payment.countDocuments(filterQuery);

        // Return data and pagination information
        return Promise.resolve({
            data: payment,
            pagination: {
                hasPrevious: page > 1, // Check if there is a previous page
                prevPage: page - 1, // Get the previous page number
                hasNext: page < Math.ceil(total / perpage), // Check if there is a next page
                next: page + 1, // Get the next page number
                currentPage: Number(page), // Get the current page number
                total: total, // Get the total number of records
                pageSize: perpage, // Get the page size
                lastPage: Math.ceil(total / perpage),
            },
        });
    }

    // Get all user's payments based on filter query passed
    public async getAllUserpayments(
        filter: any
    ): Promise<IPaymentDocument[] | null | any> {
        return Payment.find({ ...filter });
    }

    // Get all payments based on the query parameter passed
    // public async findV2(
    //     query: any,
    //     select: any = ""
    // ): Promise<IpaymentDocument | null | any> {
    //     return payment.find(query).select(select);
    // }

    // // Get all payments
    // public async findV4(
    //     req: ExpressRequest,
    //     user_id: any
    // ): Promise<IpaymentDocument | null | any> {
    //     const { query } = req;
    //     const perpage = Number(query.perpage) || 10;
    //     const page = Number(query.page) || 1;
    //     const dateFrom: any = query.dateFrom || "Jan 1 2021";
    //     const dateTo: any = query.dateTo || `${Date()}`;
    //     const skip = page * perpage - perpage;
    //     let period = String(query.period) || "90days";
    //     let payment_type = String(query.payment_type) || "all";
    //     let investment_category = String(query.investment_category) || "all";

    //     // Check the period and set the time filter accordingly
    //     const timeFilter = await repoTime({ period, dateFrom, dateTo });
    //     const payment_typeFilter = repopaymentType({ payment_type: payment_type });
    //     const investment_categoryFilter = repoInvestmentCategory({
    //         investment_category: investment_category,
    //     });

    //     // Add timeFilter, user_id, payment_typeFilter to the filter object
    //     const filter = {
    //         ...timeFilter,
    //         ...investment_categoryFilter,
    //         user_id: user_id,
    //         ...payment_typeFilter,
    //     };

    //     // Get the payment documents from the database
    //     const payment_pipeline = [
    //         {
    //             $match: filter,
    //         },
    //         { $skip: skip },
    //         { $limit: perpage },

    //         {
    //             $lookup: {
    //                 from: "investments",
    //                 localField: "investments",
    //                 foreignField: "_id",
    //                 as: "investment",
    //             },
    //         },

    //         {
    //             $unwind: {
    //                 path: "$investment",
    //                 preserveNullAndEmptyArrays: true,
    //             },
    //         },

    //         {
    //             $lookup: {
    //                 from: "listings",
    //                 localField: "investment.listing_id",
    //                 foreignField: "_id",
    //                 as: "listing",
    //             },
    //         },

    //         { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },

    //         {
    //             $addFields: {
    //                 assets: {
    //                     $cond: {
    //                         if: {
    //                             $eq: ["$listing._id", "$investment.listing_id"],
    //                         },
    //                         then: "$listing._id",
    //                         else: ["$listing._id", "$investment.listing_id"],
    //                     },
    //                 },
    //             },
    //         },

    //         {
    //             $group: {
    //                 _id: {
    //                     listing_id: "$listing._id",
    //                     investment_id: "$investment._id",
    //                 },
    //                 payment_id: { $first: "$_id" },
    //                 payment_name: { $first: "$payment_name" },
    //                 createdAt: { $first: "$createdAt" },
    //                 payment_occurrence: { $first: "$payment_occurrence" },
    //                 payment_status: { $first: "$payment_status" },
    //                 investment_category: { $first: "$investment_category" },
    //                 no_tokens: { $first: "$no_tokens" },
    //                 listing: { $push: "$listing" },
    //                 investment: { $push: "$investment" },
    //                 assets: { $addToSet: "$assets" },
    //             },
    //         },

    //         {
    //             $unwind: "$listing",
    //         },

    //         {
    //             $unwind: "$investment",
    //         },

    //         {
    //             $project: {
    //                 _id: 0,
    //                 payment_id: 1,
    //                 payment_name: 1,
    //                 createdAt: 1,
    //                 payment_occurrence: 1,
    //                 payment_status: 1,
    //                 investment_category: 1,
    //                 assets: 1,
    //                 no_tokens: 1,
    //                 currency: "$investment.investment_currency",

    //                 current_returns: format_query_decimal(
    //                     {
    //                         $multiply: [
    //                             {
    //                                 $divide: [
    //                                     {
    //                                         $dateDiff: {
    //                                             startDate:
    //                                                 "$investment.start_date",
    //                                             endDate: "$$NOW",
    //                                             unit: "second",
    //                                         },
    //                                     },
    //                                     {
    //                                         $dateDiff: {
    //                                             startDate:
    //                                                 "$investment.start_date",
    //                                             endDate: "$investment.end_date",
    //                                             unit: "second",
    //                                         },
    //                                     },
    //                                 ],
    //                             },
    //                             {
    //                                 $multiply: [
    //                                     "$investment.amount",
    //                                     { $divide: ["$listing.returns", 100] },
    //                                 ],
    //                             },
    //                         ],
    //                     },
    //                     1000
    //                 ),

    //                 current_value: format_query_decimal(
    //                     {
    //                         $add: [
    //                             "$investment.amount",
    //                             {
    //                                 $cond: {
    //                                     if: {
    //                                         $and: [
    //                                             {
    //                                                 $eq: [
    //                                                     "$listing._id",
    //                                                     "$listing_id",
    //                                                 ],
    //                                             },
    //                                             {
    //                                                 $eq: [
    //                                                     "$investment.investment_status",
    //                                                     IInvestmentStatus.INVESTMENT_MATURED,
    //                                                 ],
    //                                             },
    //                                         ],
    //                                     },
    //                                     then: format_query_decimal(
    //                                         {
    //                                             $multiply: [
    //                                                 "$investment.amount",
    //                                                 {
    //                                                     $divide: [
    //                                                         "$listing.returns",
    //                                                         100,
    //                                                     ],
    //                                                 },
    //                                             ],
    //                                         },
    //                                         1000
    //                                     ),

    //                                     else: format_query_decimal(
    //                                         {
    //                                             $multiply: [
    //                                                 {
    //                                                     $divide: [
    //                                                         // Current Date
    //                                                         {
    //                                                             $subtract: [
    //                                                                 "$$NOW",
    //                                                                 "$investment.start_date",
    //                                                             ],
    //                                                         },

    //                                                         // Completed Date
    //                                                         {
    //                                                             $subtract: [
    //                                                                 "$investment.end_date",
    //                                                                 "$investment.start_date",
    //                                                             ],
    //                                                         },
    //                                                     ],
    //                                                 },
    //                                                 {
    //                                                     $multiply: [
    //                                                         "$investment.amount",
    //                                                         {
    //                                                             $divide: [
    //                                                                 "$listing.returns",
    //                                                                 100,
    //                                                             ],
    //                                                         },
    //                                                     ],
    //                                                 },
    //                                             ],
    //                                         },
    //                                         1000
    //                                     ),
    //                                 },
    //                             },
    //                         ],
    //                     },
    //                     100
    //                 ),

    //                 investment: 1,
    //                 listing: 1,
    //             },
    //         },

    //         {
    //             $sort: {
    //                 createdAt: -1,
    //             },
    //         },

    //         {
    //             $group: {
    //                 _id: "$payment_id",
    //                 current_returns: { $sum: "$current_returns" },
    //                 current_value: { $sum: "$current_value" },
    //                 assets: { $first: "$assets" },
    //                 payment_name: { $first: "$payment_name" },
    //                 payment_status: { $first: "$payment_status" },
    //                 payment_occurrence: { $first: "$payment_occurrence" },
    //                 investment_category: { $first: "$investment_category" },
    //                 no_tokens: {
    //                     $first: format_query_decimal("$no_tokens", 100),
    //                 },
    //                 total_amount: {
    //                     $sum: format_query_decimal("$investment.amount", 100),
    //                 },
    //                 holding_period: { $first: "$listing.holding_period" },
    //                 createdAt: { $first: "$createdAt" },
    //                 currency: { $first: "$investment.investment_currency" },
    //             },
    //         },

    //         {
    //             $project: {
    //                 _id: 1,
    //                 current_returns: 1,
    //                 current_value: 1,
    //                 assets: { $size: "$assets" },
    //                 payment_name: 1,
    //                 payment_occurrence: 1,
    //                 payment_status: 1,
    //                 investment_category: 1,
    //                 no_tokens: 1,
    //                 total_amount: 1,
    //                 createdAt: 1,
    //                 holding_period: 1,
    //                 currency: 1,
    //             },
    //         },
    //         {
    //             $sort: {
    //                 createdAt: -1,
    //             },
    //         },
    //     ];

    //     const payment = await this.findAggregate(payment_pipeline);

    //     // Get total of payment documents
    //     const total = await this.countDocs(filter);

    //     const pagination = repoPagination({ page, perpage, total: total! });

    //     // Return data and pagination information
    //     return { data: payment, pagination };
    // }

    // // Get all payments (Export)
    // public async findV4NoPagination(
    //     req: ExpressRequest,
    //     user_id: any
    // ): Promise<IpaymentDocument | null | any> {
    //     const { query } = req;
    //     const dateFrom: any = query.dateFrom || "Jan 1 2021";
    //     const dateTo: any = query.dateTo || `${Date()}`;
    //     let period = String(query.period) || "custom";

    //     let payment_type = String(query.payment_type) || "all";
    //     let investment_category = String(query.investment_category) || "all";

    //     const payment_typeFilter = repopaymentType({ payment_type: payment_type });
    //     const investment_categoryFilter = repoInvestmentCategory({
    //         investment_category: investment_category,
    //     });

    //     // Check the period and set the time filter accordingly
    //     const timeFilter = await repoTime({ period, dateFrom, dateTo });

    //     // Add createdAt, user_id to the filter query object
    //     const filterQuery = {
    //         ...timeFilter,
    //         user_id: user_id,
    //         ...investment_categoryFilter,
    //         ...payment_typeFilter,
    //     };

    //     // Get the payment documents from the database
    //     const payment_pipeline = [
    //         {
    //             $match: filterQuery,
    //         },

    //         {
    //             $lookup: {
    //                 from: "investments",
    //                 localField: "investments",
    //                 foreignField: "_id",
    //                 as: "investment",
    //             },
    //         },

    //         {
    //             $unwind: {
    //                 path: "$investment",
    //                 preserveNullAndEmptyArrays: true,
    //             },
    //         },

    //         {
    //             $lookup: {
    //                 from: "listings",
    //                 localField: "investment.listing_id",
    //                 foreignField: "_id",
    //                 as: "listing",
    //             },
    //         },

    //         { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },

    //         {
    //             $addFields: {
    //                 assets: {
    //                     $cond: {
    //                         if: {
    //                             $eq: ["$listing._id", "$investment.listing_id"],
    //                         },
    //                         then: "$listing._id",
    //                         else: ["$listing._id", "$investment.listing_id"],
    //                     },
    //                 },
    //             },
    //         },

    //         {
    //             $group: {
    //                 _id: {
    //                     listing_id: "$listing._id",
    //                     investment_id: "$investment._id",
    //                 },
    //                 payment_id: { $first: "$_id" },
    //                 payment_name: { $first: "$payment_name" },
    //                 createdAt: { $first: "$createdAt" },
    //                 payment_occurrence: { $first: "$payment_occurrence" },
    //                 payment_status: { $first: "$payment_status" },
    //                 investment_category: { $first: "$investment_category" },
    //                 no_tokens: { $first: "$no_tokens" },
    //                 listing: { $push: "$listing" },
    //                 investment: { $push: "$investment" },
    //                 assets: { $addToSet: "$assets" },
    //             },
    //         },

    //         {
    //             $unwind: "$listing",
    //         },

    //         {
    //             $unwind: "$investment",
    //         },

    //         {
    //             $project: {
    //                 _id: 0,
    //                 payment_id: 1,
    //                 payment_name: 1,
    //                 createdAt: 1,
    //                 payment_occurrence: 1,
    //                 payment_status: 1,
    //                 investment_category: 1,
    //                 assets: 1,
    //                 no_tokens: 1,
    //                 currency: "$investment.investment_currency",

    //                 current_returns: format_query_decimal(
    //                     {
    //                         $multiply: [
    //                             {
    //                                 $divide: [
    //                                     {
    //                                         $dateDiff: {
    //                                             startDate:
    //                                                 "$investment.start_date",
    //                                             endDate: "$$NOW",
    //                                             unit: "second",
    //                                         },
    //                                     },
    //                                     {
    //                                         $dateDiff: {
    //                                             startDate:
    //                                                 "$investment.start_date",
    //                                             endDate: "$investment.end_date",
    //                                             unit: "second",
    //                                         },
    //                                     },
    //                                 ],
    //                             },
    //                             {
    //                                 $multiply: [
    //                                     "$investment.amount",
    //                                     { $divide: ["$listing.returns", 100] },
    //                                 ],
    //                             },
    //                         ],
    //                     },
    //                     1000
    //                 ),

    //                 current_value: format_query_decimal(
    //                     {
    //                         $add: [
    //                             "$investment.amount",
    //                             {
    //                                 $cond: {
    //                                     if: {
    //                                         $and: [
    //                                             {
    //                                                 $eq: [
    //                                                     "$listing._id",
    //                                                     "$listing_id",
    //                                                 ],
    //                                             },
    //                                             {
    //                                                 $eq: [
    //                                                     "$investment.investment_status",
    //                                                     IInvestmentStatus.INVESTMENT_MATURED,
    //                                                 ],
    //                                             },
    //                                         ],
    //                                     },
    //                                     then: format_query_decimal(
    //                                         {
    //                                             $multiply: [
    //                                                 "$investment.amount",
    //                                                 {
    //                                                     $divide: [
    //                                                         "$listing.returns",
    //                                                         100,
    //                                                     ],
    //                                                 },
    //                                             ],
    //                                         },
    //                                         1000
    //                                     ),

    //                                     else: format_query_decimal(
    //                                         {
    //                                             $multiply: [
    //                                                 {
    //                                                     $divide: [
    //                                                         // Current Date
    //                                                         {
    //                                                             $subtract: [
    //                                                                 "$$NOW",
    //                                                                 "$investment.start_date",
    //                                                             ],
    //                                                         },

    //                                                         // Completed Date
    //                                                         {
    //                                                             $subtract: [
    //                                                                 "$investment.end_date",
    //                                                                 "$investment.start_date",
    //                                                             ],
    //                                                         },
    //                                                     ],
    //                                                 },
    //                                                 {
    //                                                     $multiply: [
    //                                                         "$investment.amount",
    //                                                         {
    //                                                             $divide: [
    //                                                                 "$listing.returns",
    //                                                                 100,
    //                                                             ],
    //                                                         },
    //                                                     ],
    //                                                 },
    //                                             ],
    //                                         },
    //                                         1000
    //                                     ),
    //                                 },
    //                             },
    //                         ],
    //                     },
    //                     100
    //                 ),

    //                 investment: 1,
    //                 listing: 1,
    //             },
    //         },

    //         {
    //             $sort: {
    //                 createdAt: -1,
    //             },
    //         },

    //         {
    //             $group: {
    //                 _id: "$payment_id",
    //                 current_returns: { $sum: "$current_returns" },
    //                 current_value: { $sum: "$current_value" },
    //                 assets: { $first: "$assets" },
    //                 payment_name: { $first: "$payment_name" },
    //                 payment_status: { $first: "$payment_status" },
    //                 payment_occurrence: { $first: "$payment_occurrence" },
    //                 investment_category: { $first: "$investment_category" },
    //                 no_tokens: {
    //                     $first: format_query_decimal("$no_tokens", 100),
    //                 },
    //                 total_amount: {
    //                     $sum: format_query_decimal("$investment.amount", 100),
    //                 },
    //                 holding_period: { $first: "$listing.holding_period" },
    //                 createdAt: { $first: "$createdAt" },
    //                 currency: { $first: "$investment.investment_currency" },
    //             },
    //         },

    //         {
    //             $project: {
    //                 _id: 1,
    //                 current_returns: 1,
    //                 current_value: 1,
    //                 assets: { $size: "$assets" },
    //                 payment_name: 1,
    //                 payment_occurrence: 1,
    //                 payment_status: 1,
    //                 investment_category: 1,
    //                 no_tokens: 1,
    //                 total_amount: 1,
    //                 createdAt: 1,
    //                 holding_period: 1,
    //                 currency: 1,
    //             },
    //         },
    //         {
    //             $sort: {
    //                 createdAt: -1,
    //             },
    //         },
    //     ];

    //     const payment = await this.findAggregate(payment_pipeline);

    //     return payment;
    // }

    // // Get the aggregated payments based on query object passed
    // public async findAggregate(query: any): Promise<IpaymentDocument[] | null> {
    //     return payment.aggregate(query);
    // }

    // // Get the count of payment documents
    // public async countDocs(query: any): Promise<IpaymentDocument | null | any> {
    //     return payment.countDocuments({ ...query });
    // }

    // // Get Recent Investments
    // public async getRecent(
    //     req: ExpressRequest
    // ): Promise<IpaymentDocument[] | null | any> {
    //     const { query } = req;
    //     const perpage = Number(query.perpage) || 10;
    //     const page = Number(query.page) || 1;
    //     const skip = page * perpage - perpage;
    //     const search = String(query.search);

    //     // Check if there is a search string and add it to the search query object
    //     const searching = repoSearch({
    //         search: search,
    //         searchArray: [
    //             "user.first_name",
    //             "user.middle_name",
    //             "user.last_name",
    //             "user.email",
    //         ],
    //     });

    //     // create the payment pipeline
    //     const payment_pipeline = [
    //         { $sort: { createdAt: -1 } },
    //         { $limit: 10 },
    //         {
    //             $lookup: {
    //                 from: "users",
    //                 localField: "user_id",
    //                 foreignField: "_id",
    //                 as: "user",
    //             },
    //         },
    //         { $unwind: "$user" },
    //         {
    //             $lookup: {
    //                 from: "listings",
    //                 localField: "listing_id",
    //                 foreignField: "_id",
    //                 as: "listing",
    //             },
    //         },
    //         { $unwind: "$listing" },
    //         { $match: { ...searching } },
    //         {
    //             $project: {
    //                 first_name: "$user.first_name",
    //                 last_name: "$user.last_name",
    //                 email: "$user.email",
    //                 profile_photo: "$user.profile_photo",
    //                 project_name: "$listing.project_name",
    //                 amount_invested: "$amount",
    //                 payment_occurrence: 1,
    //                 payment_name: 1,
    //                 createdAt: 1,
    //             },
    //         },
    //         { $skip: skip },
    //         { $limit: perpage },
    //     ];

    //     // Get the payment and total documents from the database
    //     const payment_stat = await this.findAggregate(payment_pipeline);
    //     const total = await this.countDocs({ ...searching });

    //     const pagination = repoPagination({ page, perpage, total: total! });

    //     // Return data and pagination information
    //     return {
    //         data: payment_stat,
    //         pagination,
    //     };
    // }
}

// Export paymentRepository
export default new PaymentRepository();
