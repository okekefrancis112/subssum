import { FilterQuery, Types, Aggregate, Model } from "mongoose";
import { IWalletsDocument } from "../interfaces/wallet.interface";
import { ReferWallet, Transaction, Wallet } from "../models";
import { CreateWalletDto } from "../dtos/wallet.dto";
import { IReferWalletDocument } from "../interfaces/refer-wallet.interface";
import { ExpressRequest } from "../server";
import {
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionDocument,
    ITransactionMedium,
    ITransactionStatus,
    ITransactionType,
} from "../interfaces/transaction.interface";
import UtilFunctions, {
    convertDate,
    format_query_decimal,
    getDaysDate,
    repoPagination,
    repoPaymentChannel,
    repoSearch,
    repoTime,
    repoTransactionChannels,
    repoTransactionPaymentChannel,
    repoTransactionPaymentMethod,
    repoTransactionTypeCategory,
} from "../util";
import moment from "moment";
import transactionRepository from "./transaction.repository";
import withdrawalRepository from "./withdrawal.repository";
import { IWithdrawalRequestsDocument } from "../interfaces/withdrawal-requests.interface";

class WalletRepository {
    // Create Wallet
    public async create({
        user_id,
        user,
        wallet_account_number,
        total_credit_transactions,
        currency,
        balance,
    }: CreateWalletDto): Promise<IWalletsDocument> {
        const data = {
            user_id,
            user,
            wallet_account_number,
            total_credit_transactions,
            currency,
            balance,
        };

        const wallet = new Wallet(data);

        return await wallet.save();
    }

    // Create WalletMigration
    public async createMigration({
        _id,
        user_id,
        user,
        wallet_account_number,
        status,
        currency,
        balance,
        createdAt,
        updatedAt,
        last_withdrawal,
        last_deposit,
    }: {
        _id: Types.ObjectId;
        user_id: Types.ObjectId;
        user?: any;
        wallet_account_number: string;
        status: string;
        currency: string;
        balance: number;
        createdAt: Date;
        updatedAt: Date;
        last_withdrawal: number;
        last_deposit: number;
    }): Promise<IWalletsDocument> {
        const data = {
            _id,
            user_id,
            user,
            wallet_account_number,
            status,
            currency,
            balance,
            createdAt,
            updatedAt,
            last_withdrawal,
            last_deposit,
        };

        const wallet = new Wallet(data);

        return await wallet.save();
    }

    // Create Refer Wallet
    public async createReferWallet({
        user_id,
        user,
        balance,
        session = null,
    }: {
        user_id: Types.ObjectId;
        user: any;
        balance: number;
        session?: any;
    }): Promise<IReferWalletDocument | null | any> {
        const data = {
            user_id,
            user,
            balance,
        };

        const wallet = await ReferWallet.create([data], { session });

        return { success: true, data: wallet[0] };
    }

    public async getOne(
        query: FilterQuery<IWalletsDocument>,
        populate: string = ""
    ): Promise<IWalletsDocument | null> {
        return Wallet.findOne(query).populate(populate).lean(true);
    }

    // Get wallet by user_id
    public async getByUserId({
        user_id,
    }: {
        user_id: Types.ObjectId;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOne({ user_id });
    }

    // Get wallet by wallet_account_number
    public async wallet_account_number({
        wallet_account_number,
    }: {
        wallet_account_number: any;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOne({ wallet_account_number });
    }

    public async getUserWalletTransactions(
        req: ExpressRequest,
        user_id: Types.ObjectId
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req;
        const perpage = Number(query?.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search);
        const channel = String(query.channel) || "all";
        const payment_method = String(query.payment_method) || "all";
        const category = String(query.category) || "all";

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021";
        const dateTo = query.dateTo || `${Date()}`;
        let period = String(query.period) || "custom";

        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        const searchFilter = repoSearch({
            search,
            searchArray: ["description"],
        });

        const paymentChannelFilter = repoTransactionChannels({ channel });

        const paymentMethodFilter = repoTransactionPaymentMethod({
            payment_method,
        });

        const transactionCategoryFilter = repoTransactionTypeCategory({
            category,
        });

        const filter = {
            ...paymentChannelFilter,
            ...timeFilter,
            ...searchFilter,
            ...paymentMethodFilter,
            ...transactionCategoryFilter,
        };

        const transactions = await transactionRepository.findAggregate([
            {
                $match: { user_id: new Types.ObjectId(user_id) },
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
                $match: filter,
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },

            {
                $project: {
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    payment_reference: "$payment_reference",
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    transaction_status: 1,
                    transaction_category: "$transaction_type",
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    wallet_balance_before: {
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
                    wallet_balance_after: {
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
                    currency: "$currency",
                },
            },
        ]);

        // Count total number of documents found
        const total = await transactionRepository.countDocs({
            user_id,
            ...filter,
        });

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: transactions,
            pagination,
        };
    }

    // Get wallet by user_id
    public async getWalletByUserId(
        req: ExpressRequest,
        user_id: any
    ): Promise<IWalletsDocument[] | null | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const transaction_type = query.transaction_type ?? "fund";
        const status = query.status || "all";
        const search = String(query.search);
        const channel = query.channel || "all";
        let search_query = {};

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "custom";
        let timeFilter = {};
        let days;

        const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
        const current_date = new Date(); // Get the current date

        // Check the period and set the time filter accordingly
        if (period === "custom") {
            timeFilter = {
                createdAt: {
                    $gte: new Date(myDateFrom),
                    $lte: new Date(myDateTo),
                },
            };
        } else if (period === "today") {
            timeFilter = {
                createdAt: { $gte: new Date(start), $lte: new Date(end) },
            };
        } else if (period === "7days") {
            days = await UtilFunctions.subtractDays(7);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        } else if (period === "30days") {
            days = await UtilFunctions.subtractDays(30);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        }

        // Check if there is a search string and add it to the search query object
        if (
            search &&
            search !== "undefined" &&
            Object.keys(search).length > 0
        ) {
            search_query = {
                $or: [
                    { payment_gateway: new RegExp(search, "i") },
                    { transaction_medium: new RegExp(search, "i") },
                    { currency: new RegExp(search, "i") },
                    { description: new RegExp(search, "i") },
                ],
            };
        }

        // Check the status and add it to the search query object
        if (status === "all") {
            search_query = {
                ...search_query,
            };
        } else if (status === ITransactionStatus.PENDING) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.PENDING,
            };
        } else if (status === ITransactionStatus.SUCCESSFUL) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.SUCCESSFUL,
            };
        } else if (status === ITransactionStatus.FAILED) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.FAILED,
            };
        }

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else if (channel === IPaymentGateway.WALLET) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.WALLET,
            };
        } else if (channel === IPaymentGateway.PAYSTACK) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.PAYSTACK,
            };
        } else if (channel === IPaymentGateway.FLUTTERWAVE) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.FLUTTERWAVE,
            };
        } else if (channel === IPaymentGateway.MONO) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.MONO,
            };
        } else if (channel === IPaymentGateway.KEBLE) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.KEBLE,
            };
        }

        // Check the transaction type and add it to the search query object
        let transaction_type_filter = {};

        if (transaction_type === "fund") {
            transaction_type_filter = {
                transaction_type: ITransactionType.CREDIT,
            };
        } else if (transaction_type === "transfer") {
            transaction_type_filter = {
                transaction_type: ITransactionType.DEBIT,
            };
        } else if (transaction_type === "withdrawal") {
            transaction_type_filter = {
                transaction_type: ITransactionType.WITHDRAWAL,
            };
        }

        // Get the wallet-transactions from the database
        const transactions = await Wallet.aggregate([
            {
                $match: {
                    user_id: new Types.ObjectId(user_id),
                },
            },

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
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                email: 1,
                                profile_photo: 1,
                            },
                        },
                    ],
                    as: "user",
                },
            },

            {
                $project: {
                    _id: 1,
                    first_name: "$user.first_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    profile_photo: "$user.profile_photo",
                    amount: { $toDouble: { $round: ["$amount", 2] } },
                    transaction_type: 1,

                    wallet_balance_before: {
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

                    wallet_balance_after: {
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
                    createdAt: 1,
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    currency: "$currency",
                    balance: 1,
                },
            },
        ]);

        // Count total number of documents found
        const total = await Wallet.countDocuments({
            transaction_medium: ITransactionMedium.WALLET,
            ...transaction_type_filter,
            ...search_query,
            ...timeFilter,
        });

        // Return data and pagination information
        return Promise.resolve({
            data: transactions,
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

    // Process wallet credit updates
    public async processWalletCreditUpdates({
        user_id,
        amount,
        balance,
        session,
    }: {
        user_id: Types.ObjectId;
        amount: number;
        balance: number;
        session: any;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOneAndUpdate(
            { user_id },
            {
                $inc: {
                    balance: Number(amount),
                    total_credit_transactions: amount,
                    no_of_credit_transactions: 1,
                },
                $set: {
                    balance_before: Number(balance),
                    balance_after: Number(balance) + Number(amount),
                    last_deposit_amount: Number(amount),
                    last_deposit_date: new Date(),
                },
            },
            { new: true, session }
        );
    }

    // Process referral wallet updates
    public async processReferWalletDebitUpdates({
        user_id,
        amount,
        balance,
        session,
    }: {
        user_id: Types.ObjectId;
        amount: number;
        balance: number;
        session: any;
    }): Promise<IReferWalletDocument | null> {
        return ReferWallet.findOneAndUpdate(
            { user_id },
            {
                $inc: {
                    balance: -Number(amount),
                    total_debit_transactions: amount,
                    no_of_debit_transactions: 1,
                },
                $set: {
                    balance_before: Number(balance),
                    balance_after: Number(balance) - Number(amount),
                    last_debit_amount: Number(amount),
                    last_debit_date: new Date(),
                },
            },
            { new: true, session }
        );
    }

    // Process wallet credit updates
    public async processWalletDebitUpdates({
        user_id,
        amount,
        balance,
        session,
    }: {
        user_id: Types.ObjectId;
        amount: number;
        balance: number;
        session: any;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOneAndUpdate(
            { user_id },
            {
                $inc: {
                    balance: -Number(amount),
                    total_debit_transactions: amount,
                    no_of_debit_transactions: 1,
                },
                $set: {
                    balance_before: Number(balance),
                    balance_after: Number(balance) - Number(amount),
                    last_debit_amount: Number(amount),
                    last_debit_date: new Date(),
                },
            },
            { new: true, session }
        );
    }

    // Process refer wallet credit updates
    public async processReferWalletCreditUpdates({
        user_id,
        amount,
        balance,
        session,
    }: {
        user_id: Types.ObjectId;
        amount: number;
        balance: number;
        session: any;
    }): Promise<IReferWalletDocument | null> {
        return ReferWallet.findOneAndUpdate(
            { user_id },
            {
                $inc: {
                    balance: Number(amount),
                    total_credit_transactions: amount,
                    no_of_credit_transactions: 1,
                },
                $set: {
                    balance_before: Number(balance),
                    balance_after: Number(balance) + Number(amount),
                    last_deposit_amount: Number(amount),
                    last_deposit_date: new Date(),
                },
            },
            { new: true, session }
        );
    }

    // Get refer wallet by user_id
    public async getReferByUserId({
        user_id,
    }: {
        user_id: Types.ObjectId;
    }): Promise<IReferWalletDocument | null> {
        return ReferWallet.findOne({ user_id });
    }

    // Get wallet by Account Number
    public async getByAccountNumber({
        wallet_account_number,
    }: {
        wallet_account_number: string;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOne({ wallet_account_number: wallet_account_number });
    }

    // Get wallet by user_id and update
    public async atomicUpdate(_id: Types.ObjectId, record: any) {
        return Wallet.findOneAndUpdate(
            { _id: _id },
            { ...record },
            { new: true }
        );
    }

    // Get wallet by user_id and delete
    public async deleteWallet({
        _id,
    }: {
        _id: Types.ObjectId;
    }): Promise<IWalletsDocument | null> {
        return Wallet.findOneAndDelete({
            _id: _id,
        });
    }

    public async find(
        query: FilterQuery<ITransactionDocument>
    ): Promise<ITransactionDocument[] | null | any> {
        return Transaction.find<ITransactionDocument>(query)
            .populate("user_id")
            .lean<ITransactionDocument[]>(true);
    }

    // This function gets all wallet funding transactions
    public async getAllFundingWallet(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search); // Set the string for searching
        const channel = String(query.channel) || "all"; // Set the channel

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period

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

        const channelFilter = repoTransactionPaymentChannel({
            channel: channel,
        });

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            transaction_type: ITransactionType.CREDIT,
            keble_transaction_type: IKebleTransactionType.WALLET_FUNDING,
            ...timeFilter,
            ...searching,
            ...channelFilter,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                    },
                    description: 1,
                    channel: "$payment_gateway",
                    transaction_status: 1,
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    wallet_balance_before: {
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
                    wallet_balance_after: {
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
                    currency: "$currency",
                },
            },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ]);

        // Count total number of documents found
        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: transactions,
            pagination,
        };
    }

    // This function gets all wallet debit transactions
    public async getAllDebitWallet(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search); // Set the string for searching
        const keble_transaction_type =
            String(query.keble_transaction_type) || "all"; // Set the string for keble_transaction_type

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period
        let keble_transaction_typeQuery = {};

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

        // Check if there is a keble_transaction_type and add it to the keble_transaction_type query object
        if (keble_transaction_type === "all") {
            keble_transaction_typeQuery = {};
        } else if (keble_transaction_type === "investment") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "investment",
            };
        } else if (keble_transaction_type === "bank-transfer") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "bank-transfer",
            };
        } else if (keble_transaction_type === "inter-transfer") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "inter-transfer",
            };
        }

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            transaction_type: {
                $in: [ITransactionType.DEBIT, ITransactionType.WITHDRAWAL],
            },
            keble_transaction_type: {
                $in: [
                    IKebleTransactionType.BANK_TRANSFER,
                    IKebleTransactionType.INTER_TRANSFER,
                    IKebleTransactionType.INVESTMENT,
                ],
            },
            ...timeFilter,
            ...searching,
            ...keble_transaction_typeQuery,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                    },
                    transaction_status: 1,
                    transaction_type: 1,
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
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
        ]);

        // Count total number of documents found
        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: transactions,
            pagination,
        };
    }

    // This function gets all wallet payment method transactions
    public async getAllWalletPaymentMethod(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search); // Set the string for searching
        const payment_method = String(query.payment_method) || "all"; // Set the string for keble_transaction_type

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period

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

        // Check if there is a payment_method and add it to the keble_transaction_type query object
        const methodFilter = repoTransactionPaymentMethod({
            payment_method: payment_method,
        });

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            ...timeFilter,
            ...searching,
            ...methodFilter,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                    },
                    transaction_status: 1,
                    transaction_type: 1,
                    payment_method: "$transaction_medium",
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
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
        ]);

        // Count total number of documents found
        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: transactions,
            pagination,
        };
    }

    // This function exports all wallet payment method transactions
    public async exportAllWalletPaymentMethod(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const payment_method = String(query.payment_method) || "all"; // Set the string for keble_transaction_type

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period

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

        // Check if there is a payment_method and add it to the keble_transaction_type query object
        const methodFilter = repoTransactionPaymentMethod({
            payment_method: payment_method,
        });

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            ...timeFilter,
            ...searching,
            ...methodFilter,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                    },
                    transaction_status: 1,
                    transaction_type: 1,
                    payment_method: "$transaction_medium",
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                },
            },

            { $sort: { createdAt: -1 } },
        ]);

        return transactions;
    }

    // This function exports all wallet debit transactions
    public async exportAllDebitWallet(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const keble_transaction_type =
            String(query.keble_transaction_type) || "all"; // Set the string for keble_transaction_type

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period
        let keble_transaction_typeQuery = {};

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

        // Check if there is a keble_transaction_type and add it to the keble_transaction_type query object
        if (keble_transaction_type === "all") {
            keble_transaction_typeQuery = {};
        } else if (keble_transaction_type === "investment") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "investment",
            };
        } else if (keble_transaction_type === "bank-transfer") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "bank-transfer",
            };
        } else if (keble_transaction_type === "inter-transfer") {
            keble_transaction_typeQuery = {
                keble_transaction_type: "inter-transfer",
            };
        }

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            transaction_type: {
                $in: [ITransactionType.DEBIT, ITransactionType.WITHDRAWAL],
            },
            keble_transaction_type: {
                $in: [
                    IKebleTransactionType.BANK_TRANSFER,
                    IKebleTransactionType.INTER_TRANSFER,
                    IKebleTransactionType.INVESTMENT,
                ],
            },
            ...timeFilter,
            ...searching,
            ...keble_transaction_typeQuery,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    transaction_status: 1,
                    transaction_type: 1,
                    category: "$keble_transaction_type",
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                },
            },

            { $sort: { createdAt: -1 } },
        ]);

        return transactions;
    }

    // This function exports all wallet funding transactions (No Pagination)
    public async exportAllFundingWallet(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        const channel = String(query.channel) || "all"; // Set the channel

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "90days"; // Set the period

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

        const channelFilter = repoTransactionPaymentChannel({
            channel: channel,
        });

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            transaction_type: ITransactionType.CREDIT,
            keble_transaction_type: IKebleTransactionType.WALLET_FUNDING,
            ...timeFilter,
            ...searching,
            ...channelFilter,
        };
        // Get the transactions from the database
        const transactions = await transactionRepository.findAggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    description: 1,
                    payment_channel: "$payment_gateway",
                    transaction_status: 1,
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    previous_balance: {
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
                    wallet_balance: {
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
                    currency: "$currency",
                },
            },

            { $sort: { createdAt: -1 } },
        ]);

        return transactions;
    }

    // This function gets all wallet transactions
    public async getWalletBalance(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period
        let filterQuery = {}; // Initialize the query filter object

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
            transaction_medium: ITransactionMedium.WALLET,
            keble_transaction_type: {
                $nin: [
                    IKebleTransactionType.INVESTMENT,
                    IKebleTransactionType.GROUP_INVESTMENT,
                ],
            },
            ...timeFilter,
            ...search_query,
            ...searching,
            ...filterQuery,
        };

        // Get the transactions from the database
        const balance = await Transaction.aggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    createdAt: 1,
                    keble_transaction_type: 1,
                    transaction_medium: 1,
                    previous_balance: {
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
                    current_balance: {
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
                    currency: "$currency",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ]);

        // Get the total number of investments
        const balance_total = await Transaction.aggregate([
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
        ]);

        const total = balance_total?.length;

        // Count total number of documents found
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return Promise.resolve({
            data: balance,
            pagination,
        });
    }

    // This function gets all wallet funding transactions
    public async getAllWalletSavings(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const search = String(query.search); // Set the string for searching
        const channel = String(query.channel) || "all"; // Set the channel

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period

        let search_query = {}; // Initialize the search query object

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

        // Check the channel and add it to the search query object
        const channelFilter = repoTransactionPaymentChannel({
            channel: channel,
        });

        const filter = {
            ...searching,
            transaction_medium: ITransactionMedium.WALLET,
            keble_transaction_type: IKebleTransactionType.SAVINGS,
            ...timeFilter,
            ...search_query,
            ...channelFilter,
        };

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
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
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    payment_reference: "$payment_reference",
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    transaction_status: 1,
                    keble_transaction_type: 1,
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    wallet_balance_before: {
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
                    wallet_balance_after: {
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
                    currency: "$currency",
                },
            },

            { $sort: { createdAt: -1 } },
            { $limit: perpage },
            { $skip: skip },
        ]);

        // Get the total number of investments
        const balance_total = await Transaction.aggregate([
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
        ]);

        const total = balance_total?.length;
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return {
            data: transactions,
            pagination,
        };
    }

    // This function gets all wallet transfer transactions
    public async getAllWalletTransactions(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req;
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const search = String(query.search);
        const channel = query.channel || "all";
        const method = query.method || "all";
        let search_query = {};

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period

        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                payment_gateway: channel,
            };
        }

        // Check the method and add it to the search query object
        if (method === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                transaction_medium: method,
            };
        }

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            "wallet.wallet_balance_before": { $ne: null },
            "wallet.wallet_balance_after": { $ne: null },
            ...searching,
            ...timeFilter,
            ...search_query,
        };

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
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
                $match: filter,
            },
            {
                $project: {
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                    },
                    payment_reference: "$payment_reference",
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    transaction_status: 1,
                    purpose: "$keble_transaction_type",
                    reason: "$withdrawalrequests.reason",
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    previous_balance: {
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
                    current_balance: {
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
                    currency: "$currency",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ]);

        // Get the total number of investments
        const balance_total = await Transaction.aggregate([
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
        ]);

        const total = balance_total?.length;

        // Return data and pagination information
        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: transactions,
            pagination,
        };
    }

    // This function gets all wallet request transactions
    public async getAllWalletRequests(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const skip = page * perpage - perpage; //calculate and set the page skip number
        const status = query.status || "all"; // Set the status of the transaction
        const search = String(query.search); // Set the string for searching
        const channel = query.channel || "all"; // Set the channel
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if search query is present
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check the status and add it to the search query object
        let statusField = "transactions.transaction_status"; // Default field name

        switch (status) {
            case "all":
                break;
            case ITransactionStatus.PENDING:
            case ITransactionStatus.SUCCESSFUL:
            case ITransactionStatus.FAILED:
                search_query = {
                    ...search_query,
                    [statusField]: status,
                };
                break;
        }

        let channelField = "payment_gateway"; // Default field name

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                [channelField]: channel,
            };
        }

        const filter = {
            ...timeFilter,
            ...search_query,
            ...searching,
        };

        const requests = await withdrawalRepository.findAggregate([
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "payment_reference",
                    as: "transactions",
                },
            },
            { $unwind: "$transactions" },
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
                    _id: "$transactions._id",
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    payment_reference: "$transactions.payment_reference",
                    description: "$transactions.description",
                    reason: "$reason",
                    sell_fx_rate: 1,
                    channel: "$transactions.payment_gateway",
                    payment_method: "$transactions.transaction_medium",
                    transaction_status: "$status",
                    keble_transaction_type:
                        "$transactions.keble_transaction_type",
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    wallet_balance_before: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$transactions.wallet.wallet_balance_before",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    wallet_balance_after: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$transactions.wallet.wallet_balance_after",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    currency: "$transactions.currency",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
        ]);

        // Count total number of documents found
        const countAll = await withdrawalRepository.findAggregate([
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "payment_reference",
                    as: "transactions",
                },
            },
            { $unwind: "$transactions" },
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
        ]);

        const pagination = repoPagination({
            page,
            perpage,
            total: countAll?.length!,
        });

        return {
            data: requests,
            pagination,
        };
    }

    // This function gets all wallet transactions
    public async getUserWallet(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const transaction_type = query.transaction_type || "fund"; // Set the type of transaction
        const status = query.status || "all"; // Set the status of the transaction
        const search = String(query.search); // Set the string for searching
        const channel = query.channel || "all"; // Set the channel
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
        const myDateTo = convertDate(dateTo); // Convert the date to a valid format
        let period = String(query.period) || "all"; // Set the period
        let timeFilter = {}; // Initialize the time filter object
        let days; // Initialize the days variable

        const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
        const current_date = new Date(); // Get the current date

        // Check the period and set the time filter accordingly
        if (period === "custom") {
            timeFilter = {
                createdAt: {
                    $gte: new Date(myDateFrom),
                    $lte: new Date(myDateTo),
                },
            };
        } else if (period === "today") {
            timeFilter = {
                createdAt: { $gte: new Date(start), $lte: new Date(end) },
            };
        } else if (period === "7days") {
            days = await UtilFunctions.subtractDays(7);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        } else if (period === "30days") {
            days = await UtilFunctions.subtractDays(30);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        }

        // Check if there is a search string and add it to the search query object
        if (
            search &&
            search !== "undefined" &&
            Object.keys(search).length > 0
        ) {
            search_query = {
                $or: [
                    { payment_gateway: new RegExp(search, "i") },
                    { transaction_medium: new RegExp(search, "i") },
                    { currency: new RegExp(search, "i") },
                    { description: new RegExp(search, "i") },
                ],
            };
        }

        // Check the status and add it to the search query object
        if (status === "all") {
            search_query = {
                ...search_query,
            };
        } else if (status === ITransactionStatus.PENDING) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.PENDING,
            };
        } else if (status === ITransactionStatus.SUCCESSFUL) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.SUCCESSFUL,
            };
        } else if (status === ITransactionStatus.FAILED) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.FAILED,
            };
        }

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else if (channel === IPaymentGateway.WALLET) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.WALLET,
            };
        } else if (channel === IPaymentGateway.PAYSTACK) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.PAYSTACK,
            };
        } else if (channel === IPaymentGateway.FLUTTERWAVE) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.FLUTTERWAVE,
            };
        } else if (channel === IPaymentGateway.MONO) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.MONO,
            };
        } else if (channel === IPaymentGateway.KEBLE) {
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.KEBLE,
            };
        }

        // Check the transaction type and add it to the search query object
        let transaction_type_filter = {};

        if (transaction_type === "fund") {
            transaction_type_filter = {
                transaction_type: ITransactionType.CREDIT,
            };
        } else if (transaction_type === "transfer") {
            transaction_type_filter = {
                transaction_type: ITransactionType.DEBIT,
            };
        } else if (transaction_type === "withdrawal") {
            transaction_type_filter = {
                transaction_type: ITransactionType.WITHDRAWAL,
            };
        }

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    ...search_query,
                    ...transaction_type_filter,
                    ...timeFilter,
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
                $project: {
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    amount: { $toDouble: { $round: ["$amount", 2] } },
                    transaction_type: 1,
                    wallet_balance_before: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_before", 2],
                        },
                    },
                    wallet_balance_after: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_after", 2],
                        },
                    },
                    createdAt: 1,
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    currency: "$currency",
                },
            },
        ]);

        // Count total number of documents found
        const total = await Transaction.countDocuments({
            transaction_medium: ITransactionMedium.WALLET,
            ...transaction_type_filter,
            ...search_query,
            ...timeFilter,
        });

        // Return data and pagination information
        return Promise.resolve({
            data: transactions,
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

    // This function gets all wallet transactions
    public async getUserWallett(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const user_id = req.user?._id; // Get the listing_id from the request params

        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        const amountFrom: any = Number(query.amountFrom); // Set the amountFrom
        const amountTo: any = Number(query.amountTo); // Set the amountTo
        const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
        const myDateTo = convertDate(dateTo); // Convert the date to a valid format
        let period = String(query.period) || "all"; // Set the period
        let sort_type = String(query.sort) || "newest"; // Set the sorting type
        let timeFilter = {}; // Initialize the time filter object
        let days; // Initialize the days variable

        // const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
        const current_date = new Date(); // Get the current date

        // Check the period and set the time filter accordingly
        if (period === "all") {
            timeFilter = {};
        } else if (period === "7days") {
            days = await UtilFunctions.subtractDays(7);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        } else if (period === "30days") {
            days = await UtilFunctions.subtractDays(30);
            timeFilter = {
                createdAt: {
                    $gte: new Date(days),
                    $lte: new Date(current_date),
                },
            };
        } else if (period === "custom") {
            timeFilter = {
                createdAt: {
                    $gte: new Date(myDateFrom),
                    $lte: new Date(myDateTo),
                },
            };

            // Check if there is a search string and add it to the search query object
            if (
                search &&
                search !== "undefined" &&
                Object.keys(search).length > 0
            ) {
                search_query = {
                    $or: [
                        { payment_gateway: new RegExp(search, "i") },
                        { transaction_medium: new RegExp(search, "i") },
                        { currency: new RegExp(search, "i") },
                        { description: new RegExp(search, "i") },
                    ],
                };
            }

            // Check the transaction type and add it to the search query object
            let sort_filter = {};

            if (sort_type === "newest") {
                sort_filter = { sort: -1 };
            } else {
                sort_filter = { sort: 1 };
            }

            // Check the transaction amount and add it to the search query object
            let amount_filter = {
                balance: {
                    $gte: new Number(amountFrom),
                    $lte: new Number(amountTo),
                },
            };

            // Get the transactions from the database
            const transactions = await Transaction.aggregate([
                {
                    $match: {
                        ...search_query,
                        ...timeFilter,
                        ...sort_filter,
                        ...amount_filter,
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
                    $project: {
                        _id: 1,
                        amount: { $toDouble: { $round: ["$amount", 2] } },
                        transaction_type: 1,
                        wallet_balance_before: {
                            $toDouble: {
                                $round: ["$wallet.wallet_balance_before", 2],
                            },
                        },
                        wallet_balance_after: {
                            $toDouble: {
                                $round: ["$wallet.wallet_balance_after", 2],
                            },
                        },
                        createdAt: 1,
                        description: 1,
                        channel: "$payment_gateway",
                        payment_method: "$transaction_medium",
                        currency: "$currency",
                    },
                },
            ]);

            // Count total number of documents found
            const total = await Transaction.countDocuments({
                ...search_query,
                ...timeFilter,
                ...sort_filter,
                ...amount_filter,
            });

            // Return data and pagination information
            return Promise.resolve({
                data: transactions,
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
    }

    // This function gets all wallet transactions
    public async getAllWalletNoPagination(
        req: ExpressRequest // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const transaction_type = String(query.transaction_type) || "fund"; // Set the type of transaction
        const status = String(query.status) || "all"; // Set the status of the transaction
        const search = String(query.search); // Set the string for searching
        const channel = String(query.channel) || "all"; // Set the channel
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a search string and add it to the search query object
        if (
            search &&
            search !== "undefined" &&
            Object.keys(search).length > 0
        ) {
            search_query = {
                $or: [
                    { payment_gateway: new RegExp(search, "i") },
                    { transaction_medium: new RegExp(search, "i") },
                    { currency: new RegExp(search, "i") },
                    { description: new RegExp(search, "i") },
                ],
            };
        }

        // Check the status and add it to the search query object
        if (status === "all") {
            search_query = {
                ...search_query,
            };
        } else if (status === ITransactionStatus.PENDING) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.PENDING,
            };
        } else if (status === ITransactionStatus.SUCCESSFUL) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.SUCCESSFUL,
            };
        } else if (status === ITransactionStatus.FAILED) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.FAILED,
            };
        }

        // Check the payment_channel and add it to the search query object
        const filterChannel = repoTransactionPaymentChannel({
            channel: channel,
        });

        // Check the transaction type and add it to the search query object
        let transaction_type_filter = {};

        if (transaction_type === "fund") {
            transaction_type_filter = {
                transaction_type: ITransactionType.CREDIT,
            };
        } else if (transaction_type === "transfer") {
            transaction_type_filter = {
                transaction_type: ITransactionType.DEBIT,
                "wallet.wallet_balance_before": { $ne: null },
                "wallet.wallet_balance_after": { $ne: null },
            };
        } else if (transaction_type === "withdrawal") {
            transaction_type_filter = {
                transaction_type: ITransactionType.WITHDRAWAL,
            };
        }

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    ...search_query,
                    ...transaction_type_filter,
                    ...timeFilter,
                    ...filterChannel,
                },
            },
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

            {
                $project: {
                    _id: 1,
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: 1,
                    amount: { $toDouble: { $round: ["$amount", 2] } },
                    transaction_type: 1,
                    wallet_balance_before: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_before", 2],
                        },
                    },
                    wallet_balance_after: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_after", 2],
                        },
                    },
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    currency: "$currency",
                },
            },
        ]);

        // Return transactions data
        return transactions;
    }

    // This function gets all wallet balances
    public async getAllWalletBalanceNoPagination(
        req: ExpressRequest // Express request object
    ): Promise<IWalletsDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

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

        const balance = await Wallet.aggregate([
            {
                $match: {
                    ...search_query,
                    ...timeFilter,
                    ...searching,
                },
            },
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

            {
                $project: {
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    previous_balance: {
                        $toDouble: { $round: ["$balance_before", 2] },
                    },
                    current_balance: { $toDouble: { $round: ["$balance", 2] } },
                    currency: "$currency",
                },
            },
        ]);

        // Return data
        return balance;
    }

    // This function gets all wallet balances
    public async getAllWalletSavingNoPagination(
        req: ExpressRequest // Express request object
    ): Promise<IWalletsDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

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

        const saving = await Wallet.aggregate([
            {
                $match: {
                    ...search_query,
                    ...timeFilter,
                    ...searching,
                },
            },
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

            {
                $project: {
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    previous_balance: {
                        $toDouble: { $round: ["$balance_before", 2] },
                    },
                    current_balance: { $toDouble: { $round: ["$balance", 2] } },
                    currency: "$currency",
                },
            },
        ]);

        // Return data
        return saving;
    }

    // This function gets all wallet balances
    public async getAllWalletRequestNoPagination(
        req: ExpressRequest // Express request object
    ): Promise<IWalletsDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const status = query.status || "all"; // Set the status of the transaction
        const search = String(query.search); // Set the string for searching
        const channel = query.channel || "all"; // Set the channel
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "custom"; // Set the period

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if search query is present
        const searching = repoSearch({
            search: search,
            searchArray: [
                "user.first_name",
                "user.middle_name",
                "user.last_name",
                "user.email",
            ],
        });

        // Check the status and add it to the search query object
        let statusField = "transactions.transaction_status"; // Default field name

        switch (status) {
            case "all":
                break;
            case ITransactionStatus.PENDING:
            case ITransactionStatus.SUCCESSFUL:
            case ITransactionStatus.FAILED:
                search_query = {
                    ...search_query,
                    [statusField]: status,
                };
                break;
        }

        let channelField = "payment_gateway"; // Default field name

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                [channelField]: channel,
            };
        }

        const filter = {
            ...timeFilter,
            ...search_query,
            ...searching,
        };

        // Get the requests from the database
        const requests = await withdrawalRepository.findAggregate([
            {
                $lookup: {
                    from: "transactions",
                    localField: "transaction_id",
                    foreignField: "payment_reference",
                    as: "transactions",
                },
            },
            { $unwind: "$transactions" },
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
                    _id: "$transactions._id",
                    first_name: "$user.first_name",
                    middle_name: "$user.middle_name",
                    last_name: "$user.last_name",
                    email: "$user.email",
                    payment_reference: "$transactions.payment_reference",
                    description: "$transactions.description",
                    reason: "$reason",
                    sell_fx_rate: 1,
                    channel: "$transactions.payment_gateway",
                    payment_method: "$transactions.transaction_medium",
                    transaction_status: "$status",
                    keble_transaction_type:
                        "$transactions.keble_transaction_type",
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    previous_balance: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$transactions.wallet.wallet_balance_before",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    current_balance: {
                        $toDouble: {
                            $divide: [
                                {
                                    $trunc: {
                                        $multiply: [
                                            "$transactions.wallet.wallet_balance_after",
                                            100,
                                        ],
                                    },
                                },
                                100,
                            ],
                        },
                    },
                    currency: "$transactions.currency",
                    // _id: 1,
                    // user: {
                    //     _id: 1,
                    //     first_name: 1,
                    //     middle_name: 1,
                    //     last_name: 1,
                    //     email: 1,
                    // },
                    // payment_reference: "$payment_reference",
                    // description: 1,
                    // channel: "$payment_gateway",
                    // payment_method: "$transaction_medium",
                    // transaction_status: 1,
                    // keble_transaction_type: 1,
                    // amount: {
                    //     $toDouble: {
                    //         $divide: [
                    //             { $trunc: { $multiply: ["$amount", 100] } },
                    //             100,
                    //         ],
                    //     },
                    // },
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
                    // previous_balance: {
                    //     $toDouble: {
                    //         $divide: [
                    //             {
                    //                 $trunc: {
                    //                     $multiply: [
                    //                         "$wallet.wallet_balance_before",
                    //                         100,
                    //                     ],
                    //                 },
                    //             },
                    //             100,
                    //         ],
                    //     },
                    // },
                    // current_balance: {
                    //     $toDouble: {
                    //         $divide: [
                    //             {
                    //                 $trunc: {
                    //                     $multiply: [
                    //                         "$wallet.wallet_balance_after",
                    //                         100,
                    //                     ],
                    //                 },
                    //             },
                    //             100,
                    //         ],
                    //     },
                    // },
                    // currency: "$currency",
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        // Return data
        return requests;
    }

    // This function gets all wallet balances
    public async getAllWalletTransactionNoPagination(
        req: ExpressRequest // Express request object
    ): Promise<IWalletsDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period
        const channel = query.channel || "all";
        const method = query.method || "all";

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

        // Check the channel and add it to the search query object
        if (channel === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                payment_gateway: channel,
            };
        }

        // Check the method and add it to the search query object
        if (method === "all") {
            search_query = {
                ...search_query,
            };
        } else {
            search_query = {
                ...search_query,
                transaction_medium: method,
            };
        }

        const filter = {
            transaction_medium: ITransactionMedium.WALLET,
            "wallet.wallet_balance_before": { $ne: null },
            "wallet.wallet_balance_after": { $ne: null },
            ...searching,
            ...timeFilter,
            ...search_query,
        };

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
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
                $match: filter,
            },
            {
                $project: {
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    payment_reference: "$payment_reference",
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    transaction_status: 1,
                    purpose: "$keble_transaction_type",
                    reason: "$withdrawalrequests.reason",
                    amount: {
                        $toDouble: {
                            $divide: [
                                { $trunc: { $multiply: ["$amount", 100] } },
                                100,
                            ],
                        },
                    },
                    createdAt: 1,
                    previous_balance: {
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
                    current_balance: {
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
                    currency: "$currency",
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        // Return data
        return transactions;
    }

    // Get the count of refer documents
    public async countDocs(
        query: any
    ): Promise<ITransactionDocument | null | any> {
        return Transaction.countDocuments({ ...query });
    }

    // Get wallet chart
    public async walletChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<ITransactionDocument[] | null | any> {
        const { query } = req; // Get the query params from the request object
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
        const myDateTo = convertDate(dateTo); // Convert the date to a valid format
        const transaction_type = query.transaction_type || "amount_deposited"; // Set the transaction type
        let period = String(query.period) || "7days"; // Set the period
        let timeFilter; // Initialize the time filter
        let query_filter = {}; // Initialize the query filter object

        // Check the period and set the time filter accordingly
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
        }

        // Check the transaction type and add it to the query filter object
        if (transaction_type === "amount_deposited") {
            query_filter = {
                transaction_medium: ITransactionMedium.WALLET,
                transaction_type: ITransactionType.CREDIT,
            };
        } else if (transaction_type === "amount_withdrawn") {
            query_filter = {
                transaction_medium: ITransactionMedium.WALLET,
                transaction_type: ITransactionType.WITHDRAWAL,
            };
        }

        // Get the transactions from the database
        const wallet_aggregate = await Transaction.aggregate([
            {
                $match: query_filter,
            },
            {
                $project: {
                    amount: 1,
                    date: { $substr: ["$createdAt", 0, 10] },
                },
            },

            {
                $group: {
                    _id: {
                        date: "$date",
                    },
                    amount: { $sum: "$amount" },
                    data: { $push: "$$ROOT" },
                },
            },

            {
                $group: {
                    _id: null,
                    data: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$data", []] },
                                then: { date: "$_id.date", amount: "$amount" },
                                else: { date: "$_id.date", amount: 0 },
                            },
                        },
                    },
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
                                                amount: {
                                                    $arrayElemAt: [
                                                        "$data.amount",
                                                        "$$dateIndex",
                                                    ],
                                                },
                                            },
                                            else: {
                                                date: "$$e",
                                                amount: 0,
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
                    _id: 0,
                    date: "$data.date",
                    amount: { $toDouble: { $round: ["$data.amount", 2] } },
                },
            },
        ]);

        // Return data information
        return wallet_aggregate;
    }

    public async walletCards() {
        const total_deposits = await Transaction.aggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.CREDIT,
                },
            },
            {
                $group: {
                    _id: null,
                    total_deposits: { $sum: "$amount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    total_deposits: {
                        $toDouble: { $round: ["$total_deposits", 2] },
                    },
                },
            },
        ]);

        const total_withdrawals = await Transaction.aggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
                    transaction_type: ITransactionType.WITHDRAWAL,
                },
            },
            {
                $group: {
                    _id: null,
                    total_withdrawal: { $sum: "$amount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    total_withdrawal: {
                        $toDouble: { $round: ["$total_withdrawal", 2] },
                    },
                },
            },
        ]);

        const total_account_balance = await Transaction.aggregate([
            {
                $match: {
                    transaction_medium: ITransactionMedium.WALLET,
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

            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $match: {
                    "user.is_black_listed": false,
                },
            },
            {
                $group: {
                    _id: null,
                    total_balance: {
                        $sum: { $toDouble: "$wallet.wallet_balance_after" },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total_balance: format_query_decimal("$total_balance", 100),
                },
            },
        ]);

        // Return data information
        return {
            total_account_balance:
                total_account_balance.length > 0
                    ? total_account_balance[0].total_balance
                    : 0,
            total_deposits:
                total_deposits.length > 0
                    ? total_deposits[0].total_deposits
                    : 0,
            total_withdrawals:
                total_withdrawals.length > 0
                    ? total_withdrawals[0].total_withdrawal
                    : 0,
        };
    }

    // This function finds an aggregate of a given query
    // and returns an array of IWalletsDocument objects or null
    public async findAggregate(query: any): Promise<IWalletsDocument[] | null> {
        // Use the User model to aggregate the given query
        return Wallet.aggregate(query);
    }

    // This function gets all user wallet transactions
    public async getAllUserWalletTransactions(
        req: ExpressRequest,
        user_id: Types.ObjectId // Express request object
    ): Promise<ITransactionDocument[] | any> {
        const { query } = req; // Get the query params from the request object
        const perpage = Number(query.perpage) || 10; // Set the number of records to return
        const page = Number(query.page) || 1; // Set the page number
        const status = query.status || "all"; // Set the status of the transaction
        const search = String(query.search); // Set the string for searching
        let search_query = {}; // Initialize the search query object

        // Check if there is a search string and add it to the search query object
        if (
            search &&
            search !== "undefined" &&
            Object.keys(search).length > 0
        ) {
            search_query = {
                $or: [
                    { payment_gateway: new RegExp(search, "i") },
                    { transaction_medium: new RegExp(search, "i") },
                    { currency: new RegExp(search, "i") },
                    { description: new RegExp(search, "i") },
                ],
            };
        }

        // Check the status and add it to the search query object
        if (status === "all") {
            search_query = {
                ...search_query,
            };
        } else if (status === ITransactionStatus.PENDING) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.PENDING,
            };
        } else if (status === ITransactionStatus.SUCCESSFUL) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.SUCCESSFUL,
            };
        } else if (status === ITransactionStatus.FAILED) {
            search_query = {
                ...search_query,
                transaction_status: ITransactionStatus.FAILED,
            };
        }

        // Get the transactions from the database
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    user_id: user_id,
                    transaction_medium: ITransactionMedium.WALLET,
                    ...search_query,
                },
            },
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

            {
                $project: {
                    _id: 1,
                    user: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        profile_photo: 1,
                    },
                    transaction_type: 1,
                    wallet_balance_before: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_before", 2],
                        },
                    },
                    wallet_balance_after: {
                        $toDouble: {
                            $round: ["$wallet.wallet_balance_after", 2],
                        },
                    },
                    createdAt: 1,
                    description: 1,
                    channel: "$payment_gateway",
                    payment_method: "$transaction_medium",
                    transaction_medium: "$transaction_medium",
                    currency: "$currency",
                    status: "$transaction_status",
                    keble_transaction_type: 1,
                },
            },
        ]);

        // Count total number of documents found
        const total = await Transaction.countDocuments({
            user_id: user_id,
            transaction_medium: ITransactionMedium.WALLET,
            ...search_query,
        });
        // Return data and pagination information

        return Promise.resolve({
            data: transactions,
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
}

// Export respository
export default new WalletRepository();
