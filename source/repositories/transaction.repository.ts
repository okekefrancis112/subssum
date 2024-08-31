import moment from "moment";
import { FilterQuery, Types } from "mongoose";
import { CreateTransactionDto } from "../dtos/transaction.dto";
import {
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionDocument,
    ITransactionMedium,
    ITransactionType,
    IWalletTransactionType,
} from "../interfaces/transaction.interface";
import { Transaction } from "../models";
import { ExpressRequest } from "../server";
import UtilFunctions, {
    convertDate,
    getDaysDate,
    repoPagination,
    repoSearch,
    repoTime,
    repoTransactionCategory,
    repoTransactionPaymentChannel,
    repoTransactionPaymentMethod,
} from "../util";
import { ICurrency } from "../interfaces/exchange-rate.interface";

class TransactionRepository {
    // Create Transaction

    public async create({
        amount,
        transaction_hash,
        user_id,
        transaction_type,
        transaction_ref,
        entity_reference,
        entity_reference_id,
        sub_entity_reference_id,
        keble_transaction_type,
        transaction_medium,
        payment_reference,
        payment_gateway,
        wallet,
        description,
        sender,
        recipient,
        note,
        currency,
        exchange_rate_value,
        exchange_rate_currency,
        transaction_status,
        ip_address,
        meta_data,
        transaction_to,
        wallet_transaction_type,
        session,
    }: CreateTransactionDto): Promise<ITransactionDocument | null | any> {
        const data = {
            amount,
            transaction_hash,
            user_id,
            transaction_type,
            transaction_ref,
            entity_reference,
            entity_reference_id,
            sub_entity_reference_id,
            wallet,
            keble_transaction_type,
            transaction_medium,
            payment_reference,
            payment_gateway,
            description,
            sender,
            recipient,
            note,
            currency,
            exchange_rate_value,
            exchange_rate_currency,
            transaction_status,
            ip_address,
            transaction_to,
            wallet_transaction_type,
            meta_data,
        };

        const transaction = await Transaction.create([data], { session });

        return transaction;
    }

    // This function gets transactions by query parameter
    public async getOne(
        query: FilterQuery<ITransactionDocument>
    ): Promise<ITransactionDocument | null> {
        return Transaction.findOne(query);
    }

    public async deleteOne(
        query: FilterQuery<ITransactionDocument>
    ): Promise<ITransactionDocument | null> {
        return Transaction.findOneAndDelete(query);
    }

    public async deleteMany(
        query: FilterQuery<ITransactionDocument>
    ): Promise<ITransactionDocument[] | null | any> {
        return Transaction.deleteMany(query);
    }

    // This function gets transactions by payment reference
    public async getOneByPaymentReference(
        payment_reference: string
    ): Promise<ITransactionDocument | null> {
        return Transaction.findOne({ payment_reference });
    }

    public async find(
        query: FilterQuery<ITransactionDocument>,
        select: any = ""
    ): Promise<ITransactionDocument | null | any> {
        return Transaction.find(query).select(select).sort({ createdAt: -1 });
    }

    // This function gets all wallet transactions
    public async findPaginatedWalletTransactions(
        req: ExpressRequest,
        user_id: Types.ObjectId
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const min_amount = Number(query.min_amount) || 0;
        const max_amount = Number(query.max_amount) || Infinity;
        const period = String(query.period) || "all";

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check the user_id, timeFilter, keble_transaction_type, payment_gateway, transaction_medium, amount and add it to the filter query object
        const filterQuery = {
            ...{ user_id: user_id },
            ...timeFilter,
            ...{
                $or: [
                    { payment_gateway: IPaymentGateway.WALLET },
                    { transaction_medium: IPaymentGateway.WALLET },
                ],
            },
            ...{ amount: { $gte: min_amount, $lte: max_amount } },
            ...{
                $or: [
                    {
                        keble_transaction_type:
                            IKebleTransactionType.WALLET_DEBIT,
                    },
                    {
                        keble_transaction_type:
                            IKebleTransactionType.WALLET_FUNDING,
                    },
                ],
            },
        };

        // Get the transactions from the database
        const data = await Transaction.aggregate([
            { $match: filterQuery },
            {
                $project: {
                    keble_transaction_type: 1,
                    wallet_transaction_type: {
                        $cond: {
                            if: {
                                $ifNull: ["$wallet_transaction_type", ""],
                            },
                            then: {
                                $cond: {
                                    if: {
                                        $eq: [
                                            "$transaction_type",
                                            ITransactionType.DEBIT,
                                        ],
                                    },
                                    then: IWalletTransactionType.SEND_TO_INVESTMENT,
                                    else: IWalletTransactionType.FUND_WALLET,
                                },
                            },
                            else: "$wallet_transaction_type",
                        },
                    },
                    transaction_medium: 1,
                    transaction_type: 1,
                    createdAt: 1,
                    payment_gateway: 1,
                    transaction_status: 1,
                    description: 1,
                    payment_reference: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: ["$amount", 100],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    currency: 1,
                },
            },

            { $sort: { createdAt: -1 } },
            { $skip: page * perpage - perpage },
            { $limit: perpage },
        ]);

        const total = await this.countDocs(filterQuery);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: data,
            pagination,
        };
    }

    public async countDocs(
        query: FilterQuery<ITransactionDocument>
    ): Promise<number> {
        return Transaction.countDocuments(query).exec();
    }

    // This function gets all wallet transactions details
    public async findPaginatedWalletTransactionDetails(
        req: ExpressRequest,
        user_id: Types.ObjectId
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const period = String(query.period) || "90days";
        const search = String(query.search);
        const channel = String(query.channel) || "all";
        const payment_medium = String(query.payment_medium) || "all";
        const transaction_category =
            String(query.transaction_category) || "all";

        const searching = repoSearch({
            search: search,
            searchArray: [
                "description",
                "payment_gateway",
                "transaction_medium",
            ],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check the payment_channel and add it to the search query object
        const filterChannel = repoTransactionPaymentChannel({
            channel: channel,
        });

        // Check the payment_medium and add it to the search query object
        const filterMethod = repoTransactionPaymentMethod({
            payment_method: payment_medium,
        });

        const filterCategory = repoTransactionCategory({
            transaction_category: transaction_category,
        });

        const filterQuery = {
            transaction_medium: ITransactionMedium.WALLET,
            user_id: user_id,
            ...searching,
            ...timeFilter,
            ...filterChannel,
            ...filterMethod,
            ...filterCategory,
            "wallet.wallet_balance_before": { $ne: null },
            "wallet.wallet_balance_after": { $ne: null },
        };

        const wallet_pipeline: any = [
            {
                $match: filterQuery,
            },

            {
                $project: {
                    description: 1,
                    transaction_medium: 1,
                    transaction_status: 1,
                    payment_gateway: 1,
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    wallet_before: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$wallet.wallet_balance_before",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    wallet_after: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$wallet.wallet_balance_after",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                },
            },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ];

        const [wallet_stat] = await Promise.all([
            this.findAggregate(wallet_pipeline),
        ]);

        const total = await this.countDocs(filterQuery);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: wallet_stat,
            pagination,
        };
    }

    // This function gets all wallet transaction details (No pagination)
    public async findWalletTransactionDetailsNoPagination(
        req: ExpressRequest,
        user_id: Types.ObjectId
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const period = String(query.period) || "all";
        const search = String(query.search);
        const channel = String(query.channel) || "all";
        const payment_medium = String(query.payment_medium) || "all";
        const transaction_category =
            String(query.transaction_category) || "all";

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "description",
                "payment_gateway",
                "transaction_medium",
            ],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check the payment_channel and add it to the search query object
        const filterChannel = repoTransactionPaymentChannel({
            channel: channel,
        });

        // Check the payment_medium and add it to the search query object
        const filterMethod = repoTransactionPaymentMethod({
            payment_method: payment_medium,
        });

        const filterCategory = repoTransactionCategory({
            transaction_category: transaction_category,
        });

        // Check the transaction_medium, user_id, time_query, timeFilter, search_query and add it to the filter query object
        const filterQuery = {
            transaction_medium: ITransactionMedium.WALLET,
            user_id: user_id,
            ...searching,
            ...timeFilter,
            ...filterChannel,
            ...filterMethod,
            ...filterCategory,
            "wallet.wallet_balance_before": { $ne: null },
            "wallet.wallet_balance_after": { $ne: null },
        };

        // Get the transactions from the database
        const wallet_pipeline: any = [
            {
                $match: filterQuery,
            },

            {
                $project: {
                    description: 1,
                    transaction_medium: 1,
                    transaction_status: 1,
                    payment_gateway: 1,
                    transaction_category: "$keble_transaction_type",
                    amount: { $toDouble: { $round: ["$amount", 3] } },
                    wallet_before: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_before", 3],
                        },
                    },
                    wallet_after: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_after", 3],
                        },
                    },
                    created_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$createdAt", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    created_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$createdAt", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                },
            },

            { $sort: { createdAt: -1 } },
        ];

        const [wallet_stat] = await Promise.all([
            this.findAggregate(wallet_pipeline),
        ]);

        // Return data information
        return wallet_stat;
    }

    // Get Recent Wallet
    public async getRecent(
        req: ExpressRequest
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;

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

        const wallet_pipeline = [
            { $match: { transaction_medium: ITransactionMedium.WALLET } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $match: { ...searching } },
            {
                $project: {
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    description: 1,
                    transaction_medium: 1,
                    transaction_status: 1,
                    keble_transaction_type: 1,
                    amount: 1,
                    createdAt: 1,
                },
            },
            { $skip: skip },
            { $limit: perpage },
        ];

        const [wallet_stat, total] = await Promise.all([
            this.findAggregate(wallet_pipeline),
            Transaction.countDocuments({ ...searching }),
        ]);

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: wallet_stat,
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
     * USD TRANSACTIONS CHART
     */

    public async usdTransactionsChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "7days";
        let timeFilter;

        if (period === "custom") {
            timeFilter = getDaysDate(
                moment(myDateFrom).format(),
                moment(myDateTo).format()
            );
        } else if (period === "7days") {
            timeFilter = getDaysDate(moment().subtract(6, "days"), moment());
        } else if (period === "30days") {
            timeFilter = getDaysDate(moment().subtract(29, "days"), moment());
        } else if (period === "90days") {
            timeFilter = getDaysDate(moment().subtract(89, "days"), moment());
        } else if (period === "today") {
            timeFilter = getDaysDate(moment().subtract(0, "days"), moment());
        }

        const transaction_usd_chart_pipeline = [
            { $match: { currency: ICurrency.USD } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$_id",
                    data: {
                        $push: {
                            total: "$total",
                            date: "$data.createdAt",
                        },
                    },
                },
            },
            { $unwind: "$data" },
            {
                $project: {
                    _id: 0,
                    total: "$data.total",
                    date: { $substr: ["$data.date", 0, 10] },
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                    },
                    count: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },

            {
                $group: {
                    _id: null,
                    data: {
                        $push: {
                            date: "$_id.date",
                            count: "$count",
                        },
                    },
                },
            },

            {
                $sort: {
                    _id: -1,
                },
            },

            {
                $project: {
                    data: {
                        $map: {
                            input: timeFilter,
                            as: "e",
                            in: {
                                $let: {
                                    vars: {
                                        dateIndex: {
                                            $indexOfArray: [
                                                "$data.date",
                                                "$$e",
                                            ],
                                        },
                                    },
                                    in: {
                                        $cond: {
                                            if: { $ne: ["$$dateIndex", -1] },
                                            then: {
                                                date: "$$e",
                                                value: {
                                                    $arrayElemAt: [
                                                        "$data.count",
                                                        "$$dateIndex",
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

            {
                $sort: {
                    "data.date": 1,
                },
            },

            {
                $project: {
                    _id: 0,
                    data: "$data",
                },
            },
        ];

        const transaction_usd_chart = await this.findAggregate(
            transaction_usd_chart_pipeline
        );

        return transaction_usd_chart;
    }

    // This function updates transaction using _id
    public async atomicUpdate(_id: Types.ObjectId, record: any) {
        return Transaction.findOneAndUpdate(
            { _id: _id },
            { ...record },
            { new: true }
        );
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * NGN TRANSACTIONS CHART
     */

    public async ngnTransactionsChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<ITransactionDocument[] | null | any> {
        const { query } = req;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "7days";
        let timeFilter;

        if (period === "custom") {
            timeFilter = getDaysDate(
                moment(myDateFrom).format(),
                moment(myDateTo).format()
            );
        } else if (period === "7days") {
            timeFilter = getDaysDate(moment().subtract(6, "days"), moment());
        } else if (period === "30days") {
            timeFilter = getDaysDate(moment().subtract(29, "days"), moment());
        } else if (period === "90days") {
            timeFilter = getDaysDate(moment().subtract(89, "days"), moment());
        } else if (period === "today") {
            timeFilter = getDaysDate(moment().subtract(0, "days"), moment());
        }

        const transaction_ngn_chart_pipeline = [
            { $match: { currency: ICurrency.NGN } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$_id",
                    data: {
                        $push: {
                            total: "$total",
                            date: "$data.createdAt",
                        },
                    },
                },
            },
            { $unwind: "$data" },
            {
                $project: {
                    _id: 0,
                    total: "$data.total",
                    date: { $substr: ["$data.date", 0, 10] },
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                    },
                    count: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },

            {
                $group: {
                    _id: null,
                    data: {
                        $push: {
                            date: "$_id.date",
                            count: "$count",
                        },
                    },
                },
            },

            {
                $sort: {
                    _id: -1,
                },
            },

            {
                $project: {
                    data: {
                        $map: {
                            input: timeFilter,
                            as: "e",
                            in: {
                                $let: {
                                    vars: {
                                        dateIndex: {
                                            $indexOfArray: [
                                                "$data.date",
                                                "$$e",
                                            ],
                                        },
                                    },
                                    in: {
                                        $cond: {
                                            if: { $ne: ["$$dateIndex", -1] },
                                            then: {
                                                date: "$$e",
                                                value: {
                                                    $arrayElemAt: [
                                                        "$data.count",
                                                        "$$dateIndex",
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

            {
                $sort: {
                    "data.date": 1,
                },
            },

            {
                $project: {
                    _id: 0,
                    data: "$data",
                },
            },
        ];

        const transaction_ngn_chart = await this.findAggregate(
            transaction_ngn_chart_pipeline
        );

        return transaction_ngn_chart;
    }

    // Get Transactions by the query pipeline passed
    public async findAggregate(
        query: any
    ): Promise<ITransactionDocument[] | null> {
        return Transaction.aggregate(query);
    }
}

// Export TransactionRepository
export default new TransactionRepository();
