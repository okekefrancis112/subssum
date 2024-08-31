import bcrypt from "bcrypt";
import { FilterQuery, Types, UpdateQuery, _FilterQuery } from "mongoose";
import { ExpressRequest } from "../server";
import { IUserDocument, IWhereHow } from "../interfaces/user.interface";
import { CreateUserDto, UpdateUserDto } from "../dtos/user.dto";
import { APP_CONSTANTS } from "../constants/app_defaults.constant";
import { Blacklist, User } from "../models";
import UtilFunctions, {
    convertDate,
    format_query_decimal,
    getDaysDate,
    repoPagination,
    repoSearch,
    repoTime,
} from "../util";
import moment from "moment";
import { IBlacklistDocument } from "../interfaces/blacklist.interface";
import { format } from "winston";

class UserRepository {
    // Create User
    // This function creates a new user with the given data
    public async create({
        first_name,
        middle_name,
        last_name,
        email,
        password,
        confirm_password,
        phone_number,
        is_diaspora,
        where_how,
        referred_by,
        user_ref_code,
        ip_address,
    }: CreateUserDto): Promise<IUserDocument> {
        // Initialize data object
        const data: any = {
            accepted_terms_conditions: true,
            first_name: first_name ? first_name.trim() : "",
            middle_name: middle_name ? middle_name.trim() : "",
            last_name: last_name ? last_name.trim() : "",
            email: email.trim(),
            password,
            confirm_password,
            phone_number,
            is_diaspora,
            where_how,
            referred_by,
            user_ref_code,
            ip_address,
        };

        // If password is provided, generate salt and hash it
        if (password) {
            const salt = await bcrypt.genSalt(parseInt("10"));
            const hash = await bcrypt.hash(password, salt);

            data.password = hash;
        }

        // Create a new user with the given data
        const user = new User(data);

        // Save the user to the database
        return await user.save();
    }

    // Function to update user information
    public async update({
        user, // User object
        first_name, // First name of the user
        middle_name, // Middle name of the user
        last_name, // Last name of the user
        password, // Password of the user
        profile_photo, // Profile photo of the user
    }: UpdateUserDto): Promise<IUserDocument> {
        if (first_name) user.first_name = first_name; // Set first name of the user
        if (middle_name) user.middle_name = middle_name; // Set middle name of the user
        if (last_name) user.last_name = last_name; // Set last name of the user
        if (profile_photo) user.profile_photo = profile_photo; // Set profile photo of the user
        if (password) {
            const salt = await bcrypt.genSalt(
                parseInt(`${APP_CONSTANTS.GENERAL.SALT_ROUNDS}`)
            ); // Generate a salt for the password
            user.password = await bcrypt.hash(password, salt); // Hash the password with the generated salt
        }

        return user.save(); // Save the user object
    }

    public async processOneTimeSecretPassword({
        user_id,
    }: {
        user_id: Types.ObjectId;
    }): Promise<IUserDocument | null | any> {
        const password = UtilFunctions.generateRef({ length: 15 });

        const salt = await bcrypt.genSalt(
            parseInt(`${APP_CONSTANTS.GENERAL.SALT_ROUNDS}`)
        ); // Generate a salt for the password
        const hash = await bcrypt.hash(password, salt); // Hash the password with the generated salt

        const user = await User.findOneAndUpdate(
            { _id: user_id },
            {
                one_time_secret_password: hash,
                is_one_time_secret_password: true,
            },
            { new: true }
        );

        return {
            user: user,
            password: password,
        };
    }

    public async findAll(
        query: FilterQuery<IUserDocument>
    ): Promise<IUserDocument[]> {
        return User.find(query);
    }

    // Function to get a user document by its id
    public async getById({
        _id, // Id of the user document
        leanVersion = true, // Flag to indicate if the returned document should be in lean version or not
    }: {
        _id: Types.ObjectId; // Type of the id
        leanVersion?: boolean; // Optional flag to indicate if the returned document should be in lean version or not
    }): Promise<IUserDocument> {
        // Find the user document with the given id
        return User.findOne({
            _id: _id,
        }).lean(leanVersion); // Return the document in lean version if the flag is set to true
    }

    // Function to get a user document by its id
    public async getBlacklistedUserById({
        _id, // Id of the user document
        leanVersion = true, // Flag to indicate if the returned document should be in lean version or not
    }: {
        _id: Types.ObjectId; // Type of the id
        leanVersion?: boolean; // Optional flag to indicate if the returned document should be in lean version or not
    }): Promise<IUserDocument> {
        // Find the user document with the given id
        return User.findOne({
            _id: _id,
        })
            .select(
                "first_name middle_name last_name email is_black_listed blacklist_reason blacklist_category can_invest can_send_to_friend can_withdraw is_disabled"
            )
            .lean(leanVersion); // Return the document in lean version if the flag is set to true
    }

    // This function deletes a user from the database based on the provided _id
    public async deleteUser({
        _id,
    }: {
        _id: Types.ObjectId;
    }): Promise<IUserDocument | null> {
        // Finds and deletes the user with the given _id
        return User.findOneAndDelete({
            _id: _id,
        });
    }

    // This function soft deletes a user from the database based on the provided _id
    public async softDeleteUser({
        _id,
    }: {
        _id: Types.ObjectId;
    }): Promise<IUserDocument | null> {
        // Finds and deletes the user with the given _id
        return User.findOneAndUpdate(
            {
                _id: _id,
            },
            { is_deleted: true, is_deleted_at: new Date() },
            { new: true }
        );
    }

    // Function to get a user document by email
    // @param {Object} - An object containing the email and an optional leanVersion boolean
    // @returns {Promise<IUserDocument | null>} - A promise that resolves with a user document or null if not found
    public async getByEmail({
        email,
        leanVersion = true,
    }: {
        email: string;
        leanVersion?: boolean;
    }): Promise<IUserDocument | null> {
        // Query the User model for a document with the given email
        return User.findOne({ email }).lean(leanVersion);
    }

    // Get User By Query
    // This function takes in a query and an optional select parameter
    // It returns a promise of type IUserDocument or null if no user is found
    public async getByQuery(
        query: FilterQuery<IUserDocument>,
        select: any = ""
    ): Promise<IUserDocument | null> {
        return User.findOne(query).select(select).lean(true);
    }

    // Get User Email By Referral code
    public async getByReferralCode({
        referral_code,
        leanVersion = true,
    }: {
        referral_code: string;
        leanVersion?: boolean;
    }): Promise<IUserDocument | null> {
        return User.findOne({ user_ref_code: referral_code }).lean(leanVersion);
    }

    // This function finds a user document based on the given parameters
    public async find(
        req: ExpressRequest,
        user_id: any
    ): Promise<IUserDocument | null | any> {
        // Get query parameters from request
        const { query } = req;
        // Set default values for perpage and page if not provided
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        // Convert dates to Date objects
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        const search = String(query.search);

        let searchQuery = {};

        // Check if search parameter is present in the query
        if (search !== "undefined" && Object.keys(search).length > 0) {
            searchQuery = {
                $or: [
                    { first_name: new RegExp(search, "i") },
                    { middle_name: new RegExp(search, "i") },
                    { last_name: new RegExp(search, "i") },
                    { email: new RegExp(search, "i") },
                ],
            };
        }

        // Create filter query object
        const filterQuery = {
            createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
            referred_by: user_id,
            ...searchQuery,
        };

        // Find documents with filter query
        const plan = await User.find(filterQuery)
            .limit(perpage)
            .skip(page * perpage - perpage)
            .select(
                "first_name middle_name last_name email createdAt has_invest"
            )
            .sort({ createdAt: -1 });

        // Count total number of documents found
        const total = await User.countDocuments(filterQuery);

        // Return data and pagination information
        return Promise.resolve({
            data: plan,
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

    // This function finds a user document based on the given parameters
    public async findReferrals(
        req: ExpressRequest,
        user_id: any
    ): Promise<IUserDocument | null | any> {
        // Get query parameters from request
        const { query } = req;
        // Set default values for perpage and page if not provided
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const period = String(query.period) || "all"; // Set the period
        const skip = page * perpage - perpage; // calculate and set the page skip number

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const search = String(query.search);
        const has_invest = String(query.has_invest); // Set the investment boolean

        let has_investQuery = {};

        // Check if search parameter is present in the query
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if there is a has_invest and add it to the has_invest query object
        if (has_invest === "all") {
            has_investQuery = {};
        } else if (has_invest === "true") {
            has_investQuery = { has_invest: true };
        } else {
            has_investQuery = { has_invest: false };
        }

        // Create filter query object
        const filterQuery = {
            ...searching,
            ...timeFilter,
            ...has_investQuery,
        };

        const referral_pipeline = [
            { $match: { referred_by: user_id } },

            {
                $lookup: {
                    from: "investments",
                    let: { referredUserId: "$_id" }, // Create a variable to hold the referred user's _id
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$user_id", "$$referredUserId"],
                                }, // Match investments by user_id
                            },
                        },
                    ],
                    as: "investments",
                },
            },
            {
                $unwind: {
                    path: "$investments",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $group: {
                    _id: "$_id",
                    first_name: { $first: "$first_name" },
                    middle_name: { $first: "$middle_name" },
                    last_name: { $first: "$last_name" },
                    email: { $first: "$email" },
                    has_invest: { $first: "$has_invest" },
                    createdAt: { $first: "$createdAt" },
                    investments: { $push: "$investments" }, // Corrected field name
                },
            },

            { $match: filterQuery },

            {
                $project: {
                    _id: 0,
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    has_invest: 1,
                    createdAt: 1,
                    amount_earned: format_query_decimal(
                        {
                            $cond: {
                                if: { $eq: [{ $size: "$investments" }, 0] }, // Check if 'investments' array is empty
                                then: 0,
                                else: {
                                    $multiply: [
                                        {
                                            $arrayElemAt: [
                                                "$investments.amount",
                                                0,
                                            ],
                                        },
                                        0.02,
                                    ],
                                }, // Calculate based on the first investment
                            },
                        },
                        100
                    ),
                },
            },

            { $sort: { createdAt: -1 } },
            { $limit: perpage },
            { $skip: skip },
        ];

        // Find documents with filter query
        const referral = await this.findAggregate(referral_pipeline);

        // Count total number of documents found
        const total = await User.countDocuments(filterQuery);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination information
        return {
            data: referral,
            pagination,
        };
    }

    public async atomicUpdate(
        user_id: Types.ObjectId,
        record: UpdateQuery<IUserDocument>,
        session: any = null
    ) {
        return User.findOneAndUpdate(
            { _id: user_id },
            { ...record },
            { new: true, session }
        );
    }

    public async atomicPasswordUpdate(_id: Types.ObjectId, record: any) {
        return User.findOneAndUpdate(_id, { ...record }, { new: true });
    }

    // Update Next of Kin
    public async updateNextOfKin({
        user_id,
        nok_fullname,
        nok_email,
        nok_phone_number,
        nok_relationship,
        nok_location,
    }: {
        user_id: Types.ObjectId;
        nok_fullname: string;
        nok_email: string;
        nok_phone_number: string;
        nok_relationship: string;
        nok_location: string;
    }) {
        return User.findOneAndUpdate(
            { _id: user_id },
            {
                $set: {
                    nok_fullname,
                    nok_email,
                    nok_phone_number,
                    nok_relationship,
                    nok_location,
                },
            },
            { new: true }
        );
    }

    // Update Referral Code
    public async updateByReferralCode({
        referral_code,
    }: {
        referral_code: string;
    }) {
        return User.updateOne(
            { user_ref_code: referral_code },
            { $inc: { referral_count: 1 } }
        );
    }

    // Get Recent Users

    public async getRecent(
        req: ExpressRequest
    ): Promise<IUserDocument[] | null | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: [
                "first_name",
                "middle_name",
                "last_name",
                "email",
                "where_how",
            ],
        });

        const [users, total] = await Promise.all([
            User.find({ ...searching })
                .lean(true)
                .select(
                    "first_name middle_name last_name email where_how createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(perpage)
                .skip(page * perpage - perpage),
            User.countDocuments({ ...searching }),
        ]);

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: users,
            pagination,
        };
    }

    public async getAll(req: ExpressRequest): Promise<IUserDocument[] | any> {
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        const dateFrom = query.dateFrom || "Jan 1 2021";
        const dateTo = query.dateTo || `${Date()}`;
        const period = String(query.period) || "all";
        const latest_investment_dateFrom = query.latest_investment_dateFrom || "";
        const is_diaspora = String(query.is_diaspora) || "all";
        const has_invest = String(query.has_invest) || "all";
        const where_how = String(query.where_how) || "All";

        let latest_investment_timeFilter = {};
        let diasporaQuery = {};
        let has_investQuery = {};
        let whereHowQuery = {};

        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if search parameter is present in the query
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // add the myDateFrom and myDateTo to the time filter object
        if (latest_investment_dateFrom) {
            const _latest_investment_dateFrom = convertDate(
                query.latest_investment_dateFrom
            );
            const latest_investment_dateTo = convertDate(
                query.latest_investment_dateTo || `${Date()}`
            );
            latest_investment_timeFilter = {
                "investment.createdAt": {
                    $gte: new Date(_latest_investment_dateFrom),
                    $lte: new Date(latest_investment_dateTo),
                },
            };
        }

        // Check if there is a has_invest and add it to the has_invest query object
        if (has_invest === "all") {
            has_investQuery = {};
        } else if (has_invest === "true") {
            has_investQuery = { total_amount_invested: { $gt: 0 } };
        } else {
            has_investQuery = { total_amount_invested: { $eq: 0 } };
        }

        // If the where_how query is set to All, don't add it to the query
        if (where_how == "All") {
            whereHowQuery = {};
        } else {
            whereHowQuery = { where_how: where_how };
        }

        // Check if is_diaspora is all, true or false
        if (is_diaspora == "all") {
            diasporaQuery = {};
        } else if (is_diaspora == "true") {
            diasporaQuery = { is_diaspora: true };
        } else if (is_diaspora == "false") {
            diasporaQuery = { is_diaspora: false };
        }

        const filter = {
            ...timeFilter,
            ...searching,
            ...has_investQuery,
            ...diasporaQuery,
            ...whereHowQuery,
        };

        const users = await this.findAggregate([
            {
                $match: filter,
            },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perpage },
            {
                $lookup: {
                    from: "investments",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "investment",
                },
            },
            {
                $addFields: {
                    investment_frequency: { $size: "$investment" },
                },
            },
            {
                $unwind: {
                    path: "$investment",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: latest_investment_timeFilter,
            },
            {
                $lookup: {
                    from: "wallets",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "wallet",
                },
            },
            {
                $unwind: {
                    path: "$wallet",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $group: {
                    _id: "$_id",
                    first_name: { $first: "$first_name" },
                    middle_name: { $first: "$middle_name" },
                    last_name: { $first: "$last_name" },
                    email: { $first: "$email" },
                    createdAt: { $first: "$createdAt" },
                    where_how: { $first: "$where_how" },
                    total_amount_invested: { $sum: "$investment.amount" },
                    phone_number: { $first: "$phone_number" },
                    last_login: { $first: "$last_login" },
                    dob: { $first: "$dob" },
                    has_invest: { $first: "$has_invest" },
                    is_diaspora: { $first: "$is_diaspora" },
                    user_ref_code: { $first: "$user_ref_code" },
                    gender: { $first: "$gender" },
                    country: { $first: "$country" },
                    id_verification: { $first: "$id_verification" },
                    // id_number: { $first: "$id_number" },
                    investment_frequency: { $first: "$investment_frequency" },
                    wallet_balance_before: { $first: "$wallet.balance_before" },
                    wallet_balance_after: { $first: "$wallet.balance_after" },
                    wallet_balance: { $first: "$wallet.balance" },
                    latest_investment_date: {
                        $max: "$investment.createdAt",
                    },
                },
            },

            {
                $project: {
                    _id: 1,
                    first_name: 1,
                    middle_name: { $ifNull: ["$middle_name", ""] },
                    last_name: 1,
                    email: 1,
                    createdAt: 1,
                    where_how: 1,
                    total_amount_invested: 1,
                    phone_number: { $ifNull: ["$phone_number", ""] },
                    last_login: 1,
                    dob: { $ifNull: ["$dob", ""] },
                    has_invest: {
                        $cond: {
                            if: { $gt: ["$total_amount_invested", 0] },
                            then: "true",
                            else: "false",
                        },
                    },
                    is_diaspora: { $ifNull: ["$is_diaspora", ""] },
                    user_ref_code: 1,
                    gender: { $ifNull: ["$gender", ""] },
                    country: { $ifNull: ["$country", ""] },
                    id_verification: { $ifNull: ["$id_verification", ""] },
                    id_number: { $ifNull: ["$id_number", ""] },
                    investment_frequency: 1,
                    wallet_balance_before: format_query_decimal(
                        "$wallet_balance_before",
                        100
                    ),
                    wallet_balance_after: format_query_decimal(
                        "$wallet_balance_after",
                        100
                    ),
                    wallet_balance: format_query_decimal(
                        "$wallet_balance",
                        100
                    ),
                    latest_investment_date: 1,
                },
            },
        ]);

        const total = await this.countDocs({
            ...latest_investment_timeFilter,
            ...filter,
            ...has_investQuery,
            ...diasporaQuery,
        });

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            users,
            pagination,
        };
    }

    // Get all blacklisted users
    // This function is used to get all blacklisted users from the database
    public async getAllBlacklistedUsers(
        req: ExpressRequest
    ): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Create filter query object
        const filterQuery = {
            createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
            is_black_listed: true,
            ...searching,
        };

        // Find documents with filter query
        const blacklist = await User.find(filterQuery)
            .limit(perpage)
            .skip(page * perpage - perpage)
            .select(
                "first_name middle_name last_name email is_black_listed blacklist_reason blacklist_category can_invest can_send_to_friend can_withdraw is_disabled"
            )
            .sort({ createdAt: -1 });

        // Count total number of documents found
        const total = await this.countDocs(filterQuery);

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: blacklist,
            pagination,
        };
    }

    // Get blacklisted user history
    // This function is used to get blacklisted user history from the database
    public async getBlacklistedUserHistory(
        req: ExpressRequest
    ): Promise<IBlacklistDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const { user_id } = req.params; // Get the listing_id from the request params
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["user.first_name", "user.last_name", "user.email"],
        });

        // Create filter query object
        const filterQuery = {
            user_id: new Types.ObjectId(user_id),
            createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
            is_black_listed: true,
            ...searching,
        };

        // Find documents with filter query
        const blacklist = await Blacklist.find(filterQuery)
            .limit(perpage)
            .skip(page * perpage - perpage)
            .sort({ createdAt: -1 });

        // Count total number of documents found
        const total = blacklist.length;

        const pagination = repoPagination({ page, perpage, total: total! });

        return {
            data: blacklist,
            pagination,
        };
    }

    // Get blacklisted user history
    // This function is used to get blacklisted user history from the database
    public async getBlacklistedUserHistoryNoPagination(
        req: ExpressRequest
    ): Promise<IBlacklistDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const { user_id } = req.params; // Get the listing_id from the request params
        const search = String(query.search);
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let period = String(query.period) || "custom"; // Set the period

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["user.first_name", "user.last_name", "user.email"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Create filter query object
        const filterQuery = {
            user_id: new Types.ObjectId(user_id),
            is_black_listed: true,
            ...timeFilter,
            ...searching,
        };

        // Find documents with filter query
        const blacklist = await Blacklist.find(filterQuery);

        // const users_pipeline = [
        //   { $match: filterQuery },
        //   { $sort: { createdAt: -1 } },
        //   {
        //     $project: {
        //       // first_name: '$user.first_name',
        //       // last_name: '$user.last_name',
        //       // email: '$user.email',
        //       blacklist_reason: 1,
        //       blacklist_category: 1,
        //       is_black_listed: 1,
        //       is_disabled: 1,
        //       can_withdraw: 1,
        //       can_send_to_friend: 1,
        //       can_invest: 1,
        //     },
        //   },
        // ];

        // Find documents with filter query
        // const users = await Blacklist.(users_pipeline);

        // return users;
        return blacklist;
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * GENDER
     */
    // This function finds the gender of a user and paginates the results
    public async findGenderPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const gender = String(query.gender);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        let genderQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check if gender is all or not
        if (gender == "all") {
            genderQuery = {};
        } else {
            genderQuery = { gender };
        }

        // Create pipeline for aggregate query
        const gender_pipeline = [
            { $match: { ...genderQuery, ...searching } },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    gender: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                    createdAt: 1,
                },
            },
        ];

        const gender_stats = await this.findAggregate(gender_pipeline);

        const total = await this.countDocs({ ...genderQuery, ...searching });
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination object
        return {
            data: gender_stats,
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
     * DIASPORA
     */
    // This function finds the gender of a user and paginates the results
    public async findDiasporaPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const is_diaspora = String(query.is_diaspora);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        let diasporaQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check if is_diaspora is all, true or false
        if (is_diaspora == "all") {
            diasporaQuery = {};
        } else if (is_diaspora == "true") {
            diasporaQuery = { is_diaspora: true };
        } else if (is_diaspora == "false") {
            diasporaQuery = { is_diaspora: false };
        }

        // Create pipeline for aggregate query
        const diaspora_pipeline = [
            { $match: { ...diasporaQuery, ...searching } },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    is_diaspora: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                    createdAt: 1,
                },
            },
        ];

        const diaspora_stats = await this.findAggregate(diaspora_pipeline);

        const total = await this.countDocs({ ...diasporaQuery, ...searching });
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination object
        return {
            data: diaspora_stats,
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
     * KYC
     */
    // This function finds the gender of a user and paginates the results
    public async findKYCPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const kyc_completed = String(query.kyc_completed);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        let kycQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check if kyc_completed is all, true or false
        if (kyc_completed == "all") {
            kycQuery = {};
        } else if (kyc_completed == "true") {
            kycQuery = { kyc_completed: true };
        } else if (kyc_completed == "false") {
            kycQuery = { kyc_completed: false };
        }

        // Create pipeline for aggregate query
        const kyc_pipeline = [
            { $match: { ...kycQuery, ...searching } },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    is_diaspora: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                    createdAt: 1,
                },
            },
        ];

        const kyc_stats = await this.findAggregate(kyc_pipeline);

        const total = await this.countDocs({ ...kycQuery, ...searching });
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return data and pagination object
        return {
            data: kyc_stats,
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
     * GENDER CHART
     */
    // This function finds the gender chart based on the given parameters
    public async findGenderChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query from request
        const { query } = req;
        // Convert gender to string
        const gender = String(query.gender);

        // Set default date range if not provided
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "";
        let timeFilter;

        // Set time filter based on period
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

        // Create pipeline for aggregation
        const gender_chart_pipeline = [
            { $match: { gender } },
            {
                $project: {
                    gender: 1,
                    date: { $substr: ["$createdAt", 0, 10] },
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                        gender: "$gender",
                    },
                    count: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },

            {
                $group: {
                    _id: {
                        gender: "$_id.gender",
                    },
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
                    "_id.gender": 1,
                },
            },

            {
                $project: {
                    _id: 0,
                    gender: "$_id.gender",
                    data: "$data",
                },
            },
        ];

        // Execute aggregation pipeline
        const gender_chart = await this.findAggregate(gender_chart_pipeline);

        // Return gender chart data
        return {
            data: gender_chart,
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
     * AGE RANGE
     */

    // This function finds the age range of users based on the query parameters
    public async findAgeRange({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get the query parameters from the request
        const { query } = req;
        const age_range = String(query.age_range);
        const search = String(query.search);
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        const skip = page * perpage - perpage;
        let age_range_pipeline;

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // If age_range is set to all, use this pipeline
        if (age_range === "all") {
            age_range_pipeline = [
                { $match: { ...searching } },
                {
                    $sort: { createdAt: -1 },
                },

                {
                    $addFields: {
                        age: {
                            $cond: {
                                if: { $ne: ["$dob", ""] }, // Exclude documents with empty dob
                                then: {
                                    $dateDiff: {
                                        startDate: { $toDate: "$dob" },
                                        endDate: "$$NOW",
                                        unit: "year",
                                    },
                                },
                                else: -1, // Placeholder value for empty dob
                            },
                        },
                    },
                },

                {
                    $project: {
                        age_range: {
                            $cond: {
                                // Check the age and assign an age range accordingly
                                if: { $gte: ["$age", 18] },
                                then: {
                                    $cond: {
                                        if: { $lte: ["$age", 26] },
                                        then: "18-26",
                                        else: {
                                            $cond: {
                                                if: { $lte: ["$age", 35] },
                                                then: "26-35",
                                                else: {
                                                    $cond: {
                                                        if: {
                                                            $lte: ["$age", 45],
                                                        },
                                                        then: "35-45",
                                                        else: {
                                                            $cond: {
                                                                if: {
                                                                    $lte: [
                                                                        "$age",
                                                                        65,
                                                                    ],
                                                                },
                                                                then: "45-65",
                                                                else: {
                                                                    $cond: {
                                                                        if: {
                                                                            $lte: [
                                                                                "$age",
                                                                                120,
                                                                            ],
                                                                        },
                                                                        then: "65-120",
                                                                        else: "120+", // 120+ is the default
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                else: "not-specified", // not-specified is the default
                            },
                        },
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        has_invest: 1,
                        is_diaspora: 1,
                    },
                },
                {
                    $facet: {
                        age_range_stat: [{ $skip: skip }, { $limit: perpage }],
                        totalCount: [{ $count: "totalDocs" }],
                    },
                },
            ];
        } else {
            // Else use this pipeline
            age_range_pipeline = [
                {
                    $addFields: {
                        age: {
                            $cond: {
                                if: { $ne: ["$dob", ""] },
                                then: {
                                    $divide: [
                                        {
                                            $subtract: [
                                                new Date(),
                                                { $toDate: "$dob" },
                                            ],
                                        },
                                        31557600000, // milliseconds in a year
                                    ],
                                },
                                else: -1, // Placeholder value for empty dob
                            },
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,
                        age_range: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 18] },
                                                { $lt: ["$age", 26] },
                                            ],
                                        },
                                        then: "18-25",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 26] },
                                                { $lt: ["$age", 35] },
                                            ],
                                        },
                                        then: "26-34",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 35] },
                                                { $lt: ["$age", 45] },
                                            ],
                                        },
                                        then: "35-44",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 45] },
                                                { $lt: ["$age", 65] },
                                            ],
                                        },
                                        then: "45-64",
                                    },
                                    {
                                        case: {
                                            $lt: ["$age", 120],
                                        },
                                        then: "65+",
                                    },
                                    {
                                        case: {
                                            $eq: ["$age", -1],
                                        },
                                        then: "not-specified",
                                    },
                                ],
                            },
                        },

                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        has_invest: 1,
                        is_diaspora: 1,
                    },
                },

                {
                    $match: {
                        age_range: age_range, // Add the desired age range to filter
                        ...searching,
                    },
                },

                {
                    $sort: { createdAt: -1 },
                },

                {
                    $facet: {
                        age_range_stat: [{ $skip: skip }, { $limit: perpage }],
                        totalCount: [{ $count: "totalDocs" }],
                    },
                },
            ];
        }

        const age_range_stat: any = await this.findAggregate(
            age_range_pipeline
        );
        const totalCount = age_range_stat[0].totalCount[0].totalDocs;

        const pagination = repoPagination({
            page,
            perpage,
            total: totalCount!,
        });

        // Return the age range stats and pagination details
        return {
            data: age_range_stat,
            pagination,
        };
    }

    public async findAgeRangeNopagination({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get the query parameters from the request
        const { query } = req;
        const age_range = String(query.age_range);
        const search = String(query.search);
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period
        let age_range_pipeline;

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // If age_range is set to all, use this pipeline
        if (age_range === "all") {
            age_range_pipeline = [
                { $match: { ...searching, ...timeFilter } },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $addFields: {
                        age: {
                            $cond: {
                                if: { $ne: ["$dob", ""] }, // Exclude documents with empty dob
                                then: {
                                    $dateDiff: {
                                        startDate: { $toDate: "$dob" },
                                        endDate: "$$NOW",
                                        unit: "year",
                                    },
                                },
                                else: -1, // Placeholder value for empty dob
                            },
                        },
                    },
                },

                {
                    $project: {
                        age_range: {
                            $cond: {
                                // Check the age and assign an age range accordingly
                                if: { $gte: ["$age", 18] },
                                then: {
                                    $cond: {
                                        if: { $lte: ["$age", 26] },
                                        then: "18-25",
                                        else: {
                                            $cond: {
                                                if: { $lte: ["$age", 35] },
                                                then: "26-34",
                                                else: {
                                                    $cond: {
                                                        if: {
                                                            $lte: ["$age", 45],
                                                        },
                                                        then: "35-44",
                                                        else: {
                                                            $cond: {
                                                                if: {
                                                                    $lte: [
                                                                        "$age",
                                                                        65,
                                                                    ],
                                                                },
                                                                then: "45-64",
                                                                else: {
                                                                    $cond: {
                                                                        if: {
                                                                            $lte: [
                                                                                "$age",
                                                                                120,
                                                                            ],
                                                                        },
                                                                        then: "65-120",
                                                                        else: "120+", // 120+ is the default
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                else: "not-specified", // not-specified is the default
                            },
                        },
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        has_invest: 1,
                        is_diaspora: 1,
                    },
                },
            ];
        } else {
            // Else use this pipeline
            age_range_pipeline = [
                {
                    $addFields: {
                        age: {
                            $cond: {
                                if: { $ne: ["$dob", ""] },
                                then: {
                                    $divide: [
                                        {
                                            $subtract: [
                                                new Date(),
                                                { $toDate: "$dob" },
                                            ],
                                        },
                                        31557600000, // milliseconds in a year
                                    ],
                                },
                                else: -1, // Placeholder value for empty dob
                            },
                        },
                    },
                },

                {
                    $project: {
                        _id: 0,
                        age_range: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 18] },
                                                { $lt: ["$age", 26] },
                                            ],
                                        },
                                        then: "18-25",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 26] },
                                                { $lt: ["$age", 35] },
                                            ],
                                        },
                                        then: "26-34",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 35] },
                                                { $lt: ["$age", 45] },
                                            ],
                                        },
                                        then: "35-44",
                                    },
                                    {
                                        case: {
                                            $and: [
                                                { $gte: ["$age", 45] },
                                                { $lt: ["$age", 65] },
                                            ],
                                        },
                                        then: "45-64",
                                    },
                                    {
                                        case: {
                                            $lt: ["$age", 120],
                                        },
                                        then: "65+",
                                    },
                                    {
                                        case: {
                                            $eq: ["$age", -1],
                                        },
                                        then: "not-specified",
                                    },
                                ],
                            },
                        },
                        age: 1,
                        first_name: 1,
                        middle_name: 1,
                        last_name: 1,
                        email: 1,
                        has_invest: 1,
                        is_diaspora: 1,
                    },
                },
                {
                    $match: {
                        age_range: age_range,
                        ...searching,
                    },
                },
            ];
        }

        // Get the age range stats and total count of users
        const [age_range_stat] = await Promise.all([
            this.findAggregate(age_range_pipeline),
        ]);

        // Return the age range stats and pagination details
        return age_range_stat;
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * EXPORT AGE RANGE
     */

    // This function is used to export the age range of users
    public async exportAgeRange({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get the query from the request
        const { query } = req;
        // Convert the age_range to a string
        const age_range = String(query.age_range);

        // Create an array of aggregation pipelines
        const age_range_pipeline = [
            // Group all documents and sum the total number of documents
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            // Unwind the data field
            { $unwind: "$data" },
            // Add a new field called age which calculates the difference between the dob and current date
            {
                $addFields: {
                    age: {
                        $dateDiff: {
                            startDate: { $toDate: "$data.dob" },
                            endDate: "$$NOW",
                            unit: "year",
                        },
                    },
                },
            },
            // Bucket the documents based on the age field
            {
                $bucket: {
                    groupBy: "$age",
                    boundaries: [18, 26, 35, 45, 65, 120],
                    default: "not-specified",
                    output: { data: { $push: "$data" } },
                },
            },
            // Unwind the data field
            { $unwind: "$data" },
            // Group the documents and push the required fields into the data field
            {
                $group: {
                    _id: "$_id",
                    data: {
                        $push: {
                            age: "$data.age",
                            first_name: "$data.first_name",
                            middle_name: "$data.middle_name",
                            last_name: "$data.last_name",
                            email: "$data.email",
                            profile_photo: "$data.profile_photo",
                        },
                    },
                },
            },
            // Unwind the data field
            { $unwind: "$data" },
            // Project the required fields
            {
                $project: {
                    _id: 0,
                    age_range: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $lt: ["$_id", 26],
                                    },
                                    then: "18-25",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 35],
                                    },
                                    then: "26-34",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 46],
                                    },
                                    then: "35-44",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 65],
                                    },
                                    then: "45-64",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 120],
                                    },
                                    then: "65+",
                                },
                                {
                                    case: {
                                        $ifNull: ["$_id", "null"],
                                    },
                                    then: "not-specified",
                                },
                            ],
                        },
                    },
                    age: "$data.age",
                    first_name: "$data.first_name",
                    middle_name: "$data.middle_name",
                    last_name: "$data.last_name",
                    email: "$data.email",
                    profile_photo: "$data.profile_photo",
                },
            },
            // Match the documents with the given age_range
            { $match: { age_range: age_range } },
        ];

        // Find the aggregate of the documents using the pipeline
        const age_range_stat = await this.findAggregate(age_range_pipeline);

        // Return the result
        return age_range_stat;
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * AGE RANGE CHART
     */

    // This function finds the age range chart
    public async findAgeRangeChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query from request
        const { query } = req;
        const age_range = String(query.age_range);
        // Set default dateFrom and dateTo values
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "7days";
        let timeFilter;
        let filterQuery = {};

        // Set timeFilter based on period value
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

        // Set filterQuery based on age_range value
        if (age_range !== "undefined" && Object.keys(age_range).length > 0) {
            filterQuery = { age_range };
        }

        // Create pipeline for finding age range chart
        const age_range_chart_pipeline = [
            { $match: { dob: { $exists: true, $ne: "" } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $addFields: {
                    age: {
                        $dateDiff: {
                            startDate: { $toDate: "$data.dob" },
                            endDate: "$$NOW",
                            unit: "year",
                        },
                    },
                },
            },
            {
                $bucket: {
                    groupBy: "$age",
                    boundaries: [18, 26, 35, 45, 65, 120],
                    default: "not-specified",
                    output: { data: { $push: "$data" } },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: "$_id",
                    data: {
                        $push: {
                            age: "$data.age",
                            date: "$data.createdAt",
                        },
                    },
                },
            },
            { $unwind: "$data" },
            {
                $project: {
                    _id: 0,
                    age_range: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $lt: ["$_id", 26],
                                    },
                                    then: "18-25",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 35],
                                    },
                                    then: "26-34",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 46],
                                    },
                                    then: "35-44",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 65],
                                    },
                                    then: "45-64",
                                },
                                {
                                    case: {
                                        $lt: ["$_id", 120],
                                    },
                                    then: "65+",
                                },
                                {
                                    case: {
                                        $ifNull: ["$_id", "null"],
                                    },
                                    then: "not-specified",
                                },
                            ],
                        },
                    },
                    age: "$data.age",
                    date: { $substr: ["$data.date", 0, 10] },
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                        age_range: "$age_range",
                    },
                    count: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },

            {
                $group: {
                    _id: {
                        age_range: "$_id.age_range",
                    },
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
                    "_id.age_range": 1,
                },
            },

            {
                $project: {
                    _id: 0,
                    age_range: "$_id.age_range",
                    data: "$data",
                },
            },
            { $match: { ...filterQuery } },
        ];

        // Find age range chart using pipeline
        const age_range_chart = await this.findAggregate(
            age_range_chart_pipeline
        );

        return age_range_chart;
    }

    // This function finds an aggregate of a given query
    // and returns an array of IUserDocument objects or null
    public async findAggregate(query: any): Promise<IUserDocument[] | null> {
        // Use the User model to aggregate the given query
        return User.aggregate(query);
    }

    // Get all users - No pagination
    // This function returns an array of IUserDocument objects or null if no documents are found
    public async getAllNoPagination({
        query, // Query object to filter the documents
        select, // String containing the fields to be selected from the documents
    }: {
        query?: any; // Optional query object
        select?: string; // Optional string for selecting fields
    }): Promise<IUserDocument[] | null | any> {
        return User.find({ ...query }) // Find documents based on the query object
            .lean(true) // Return plain JavaScript objects instead of Mongoose documents
            .select(select); // Select the specified fields from the documents
    }

    // Get all users - No pagination
    public async getAllUsersNoPagination(
        req: ExpressRequest
    ): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const period = String(query.period) || "all"; // Set the period for filtering
        const latest_investment_dateFrom = query.latest_investment_dateFrom || "";
        const is_diaspora = String(query.is_diaspora) || "all";
        const has_invest = String(query.has_invest) || "all";
        const where_how = String(query.where_how) || "All";

        let latest_investment_timeFilter = {};
        let diasporaQuery = {};
        let has_investQuery = {};
        let whereHowQuery = {};

        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if search parameter is present in the query
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // add the myDateFrom and myDateTo to the time filter object
        if (latest_investment_dateFrom) {
            const _latest_investment_dateFrom = convertDate(
                query.latest_investment_dateFrom
            );
            const latest_investment_dateTo = convertDate(
                query.latest_investment_dateTo || `${Date()}`
            );
            latest_investment_timeFilter = {
                "investment.createdAt": {
                    $gte: new Date(_latest_investment_dateFrom),
                    $lte: new Date(latest_investment_dateTo),
                },
            };
        }

        // Check if there is a has_invest and add it to the has_invest query object
        if (has_invest === "all") {
            has_investQuery = {};
        } else if (has_invest === "true") {
            has_investQuery = { total_amount_invested: { $gt: 0 } };
        } else {
            has_investQuery = { total_amount_invested: { $eq: 0 } };
        }

        // If the where_how query is set to All, don't add it to the query
        if (where_how == "All") {
            whereHowQuery = {};
        } else {
            whereHowQuery = { where_how: where_how };
        }

        // Check if is_diaspora is all, true or false
        if (is_diaspora == "all") {
            diasporaQuery = {};
        } else if (is_diaspora == "true") {
            diasporaQuery = { is_diaspora: true };
        } else if (is_diaspora == "false") {
            diasporaQuery = { is_diaspora: false };
        }

        const filter = {
            ...timeFilter,
            ...searching,
            ...has_investQuery,
            ...diasporaQuery,
            ...whereHowQuery,
        };

        const user = await this.findAggregate([
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "investments",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "investment",
                },
            },
            {
                $addFields: {
                    investment_frequency: { $size: "$investment" },
                },
            },
            {
                $unwind: {
                    path: "$investment",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: latest_investment_timeFilter,
            },
            {
                $lookup: {
                    from: "wallets",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "wallet",
                },
            },
            {
                $unwind: {
                    path: "$wallet",
                    preserveNullAndEmptyArrays: true,
                },
            },

            {
                $group: {
                    _id: "$_id",
                    first_name: { $first: "$first_name" },
                    middle_name: { $first: "$middle_name" },
                    last_name: { $first: "$last_name" },
                    email: { $first: "$email" },
                    createdAt: { $first: "$createdAt" },
                    where_how: { $first: "$where_how" },
                    total_amount_invested: { $sum: "$investment.amount" },
                    phone_number: { $first: "$phone_number" },
                    last_login: { $first: "$last_login" },
                    dob: { $first: "$dob" },
                    has_invest: { $first: "$has_invest" },
                    is_diaspora: { $first: "$is_diaspora" },
                    user_ref_code: { $first: "$user_ref_code" },
                    gender: { $first: "$gender" },
                    country: { $first: "$country" },
                    id_verification: { $first: "$id_verification" },
                    // id_number: { $first: "$id_number" },
                    investment_frequency: { $first: "$investment_frequency" },
                    wallet_balance_before: { $first: "$wallet.balance_before" },
                    wallet_balance_after: { $first: "$wallet.balance_after" },
                    wallet_balance: { $first: "$wallet.balance" },
                    latest_investment_date: {
                        $max: "$investment.createdAt",
                    },
                },
            },

            {
                $project: {
                    _id: 1,
                    first_name: 1,
                    middle_name: { $ifNull: ["$middle_name", ""] },
                    last_name: 1,
                    email: 1,
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
                    where_how: 1,
                    total_amount_invested: 1,
                    phone_number: { $ifNull: ["$phone_number", ""] },
                    last_login_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: "$last_login", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    last_login_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: "$last_login", // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    dob: { $ifNull: ["$dob", ""] },
                    has_invest: 1,
                    is_diaspora: { $ifNull: ["$is_diaspora", ""] },
                    user_ref_code: 1,
                    gender: { $ifNull: ["$gender", ""] },
                    country: { $ifNull: ["$country", ""] },
                    id_verification: { $ifNull: ["$id_verification", ""] },
                    id_number: { $ifNull: ["$id_number", ""] },
                    investment_frequency: 1,
                    last_investment_date: {
                        $dateToString: {
                            format: "%Y-%m-%d", // Format string based on your requirements
                            date: { $max: "$investment.createdAt" }, // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                    last_investment_time: {
                        $dateToString: {
                            format: "%H:%M:%S", // Format string based on your requirements
                            date: { $max: "$investment.createdAt" }, // Replace 'dateField' with your actual field name containing the date
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        return user;
    }

    // Get all Blacklisted Users - No pagination
    public async getAllBlackListedUsersNoPagination(
        req: ExpressRequest
    ): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const period = String(query.period) || "all"; // Set the period for filtering

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });
        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Create filter query object
        const filterQuery = {
            ...timeFilter,
            ...searching,
            is_black_listed: true,
        };

        const users_pipeline = [
            { $match: filterQuery },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    blacklist_reason: 1,
                    blacklist_category: 1,
                    is_black_listed: 1,
                    is_disabled: 1,
                    can_withdraw: 1,
                    can_send_to_friend: 1,
                    can_invest: 1,
                },
            },
        ];

        const users = await this.findAggregate(users_pipeline);

        return users;
    }

    public async findGenderNoPagination({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const gender = String(query.gender);
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let period = String(query.period) || "all";
        let genderQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check if gender is all or not
        if (gender == "all") {
            genderQuery = {};
        } else {
            genderQuery = { gender };
        }

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Create pipeline for aggregate query
        const gender_pipeline = [
            { $match: { ...searching, ...genderQuery, ...timeFilter } },
            {
                $sort: { createdAt: -1 },
            },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    gender: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                },
            },
        ];

        const gender_stats = await this.findAggregate(gender_pipeline);

        // Return gender_stats
        return gender_stats;
    }

    public async findDiasporaNoPagination({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const is_diaspora = String(query.is_diaspora);
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let period = String(query.period) || "all";

        let diasporaQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if gender is all or not
        if (is_diaspora == "all") {
            diasporaQuery = {};
        } else if (is_diaspora == "true") {
            diasporaQuery = { is_diaspora: true };
        } else if (is_diaspora == "false") {
            diasporaQuery = { is_diaspora: false };
        }

        // Create pipeline for aggregate query
        const diaspora_pipeline = [
            { $match: { ...diasporaQuery, ...searching, ...timeFilter } },
            {
                $sort: { createdAt: -1 },
            },

            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    is_diaspora: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                    createdAt: 1,
                },
            },
        ];

        const diaspora_stats = await this.findAggregate(diaspora_pipeline);

        // Return diaspora_stats
        return diaspora_stats;
    }

    public async findKYCNoPagination({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get query parameters from request
        const { query } = req;
        const search = String(query.search);
        const kyc_completed = String(query.kyc_completed);
        const dateFrom: any = query.dateFrom || "Jan 1 2021"; // Set the dateFrom
        const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
        let period = String(query.period) || "all"; // Set the period
        let kycQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Check if kyc_completed is all, true or false
        if (kyc_completed == "all") {
            kycQuery = {};
        } else if (kyc_completed == "true") {
            kycQuery = { kyc_completed: true };
        } else if (kyc_completed == "false") {
            kycQuery = { kyc_completed: false };
        }

        // Create pipeline for aggregate query
        const kyc_pipeline = [
            { $match: { ...kycQuery, ...searching, ...timeFilter } },
            {
                $sort: { createdAt: -1 },
            },

            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    is_diaspora: 1,
                    has_invest: 1,
                    kyc_completed: 1,
                    createdAt: 1,
                },
            },
        ];

        const kyc_stats = await this.findAggregate(kyc_pipeline);

        // Return kyc_stats
        return kyc_stats;
    }

    // This function is used to find users based on the search query and where_how query
    // It also paginates the results
    public async findWhereHowPaginated({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get the search query and where_how query from the request
        const { query } = req;
        const search = String(query.search);
        const where_how = String(query.where_how) || "All";
        // Set the default page size and page number
        const perpage = Number(query.perpage) || 10;
        const page = Number(query.page) || 1;
        // Calculate the skip value for pagination
        const skip = page * perpage - perpage;
        let whereHowQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // If the where_how query is set to All, don't add it to the query
        if (where_how == "All") {
            whereHowQuery = {};
        } else {
            whereHowQuery = { where_how: where_how };
        }

        const filter = { ...searching, ...whereHowQuery };

        // Create the pipeline for the aggregate query
        const where_how_pipeline = [
            { $match: filter },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: perpage },
            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    profile_photo: 1,
                    where_how: 1,
                    has_invest: 1,
                    is_diaspora: 1,
                    createdAt: 1,
                },
            },
        ];

        // Execute the aggregate query and count query in parallel
        const [where_how_stats] = await Promise.all([
            this.findAggregate(where_how_pipeline),
        ]);

        const total = await this.countDocs(filter);
        const pagination = repoPagination({ page, perpage, total: total! });

        // Return the data and pagination object
        return {
            data: where_how_stats,
            pagination,
        };
    }

    // This function is used to find users based on the search query and where_how query
    public async findWhereHowNoPagination({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        // Get the search query and where_how query from the request
        const { query } = req;
        const search = String(query.search);
        const where_how = String(query.where_how);
        let period = String(query.period) || "all";
        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        let whereHowQuery = {};

        // Check if there is a search string and add it to the search query object
        const searching = repoSearch({
            search: search,
            searchArray: ["first_name", "middle_name", "last_name", "email"],
        });

        // If the where_how query is set to All, don't add it to the query
        if (where_how == "All") {
            whereHowQuery = {};
        } else {
            whereHowQuery = { where_how: where_how };
        }

        // Check the period and set the time filter accordingly
        const timeFilter = await repoTime({ period, dateFrom, dateTo });

        // Create the pipeline for the aggregate query
        const where_how_pipeline = [
            { $match: { ...searching, ...whereHowQuery, ...timeFilter } },
            {
                $sort: { createdAt: -1 },
            },

            {
                $project: {
                    first_name: 1,
                    middle_name: 1,
                    last_name: 1,
                    email: 1,
                    profile_photo: 1,
                    where_how: 1,
                    has_invest: 1,
                    is_diaspora: 1,
                    createdAt: 1,
                },
            },
        ];

        const where_how_stats = this.findAggregate(where_how_pipeline);

        return where_how_stats;
    }

    /************************
     ************************
     ************************
     ************************
     ************************
     *
     *
     *
     * WHERE HOW CHART
     */
    public async findWhereHowChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
        const { query } = req;
        const where_how = String(query.where_how);

        const dateFrom: any = query.dateFrom || "Jan 1 2021";
        const dateTo: any = query.dateTo || `${Date()}`;
        const myDateFrom = convertDate(dateFrom);
        const myDateTo = convertDate(dateTo);
        let period = String(query.period) || "";
        let timeFilter;
        let filterQuery;

        if (where_how == IWhereHow.ALL) {
            filterQuery = {};
        } else {
            filterQuery = { where_how: where_how };
        }

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

        const where_how_chart_pipeline = [
            { $match: filterQuery },
            {
                $project: {
                    where_how: 1,
                    date: { $substr: ["$createdAt", 0, 10] },
                },
            },
            {
                $group: {
                    _id: {
                        date: "$date",
                        where_how: "$where_how",
                    },
                    count: { $sum: 1 },
                    data: { $push: "$$ROOT" },
                },
            },
            { $unwind: "$data" },
            {
                $group: {
                    _id: {
                        where_how: "$_id.where_how",
                    },
                    data: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$data", []] },
                                then: { date: "$_id.date", count: "$count" },
                                else: { date: "$_id.date", count: 0 },
                            },
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
                    "_id.where_how": 1,
                },
            },

            {
                $project: {
                    _id: 0,
                    where_how: "$_id.where_how",
                    data: "$data",
                },
            },
        ];

        const where_how_chart = await this.findAggregate(
            where_how_chart_pipeline
        );

        return {
            data: where_how_chart,
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
     * USERS CHART
     */

    public async usersChart({
        req,
    }: {
        req: ExpressRequest;
    }): Promise<IUserDocument[] | null | any> {
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

        const user_chart_pipeline = [
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

        const user_chart = await this.findAggregate(user_chart_pipeline);

        return user_chart;
    }

    public async getPersonalInfoById(
        user_id: Types.ObjectId
    ): Promise<IUserDocument | null> {
        return User.findById(user_id).select(
            "first_name middle_name last_name email profile_photo where_how phone_number gender country createdAt has_invest user_ref_code dob address id_verification id_number last_login is_diaspora id_verified"
        );
    }

    public async getNextOfKin(
        user_id: Types.ObjectId
    ): Promise<IUserDocument | null> {
        return User.findById(user_id).select(
            "nok_fullname nok_email nok_phone_number nok_relationship nok_location -_id"
        );
    }

    // Count the number of documents using the query object provided
    public async countDocs(query: any): Promise<number> {
        return User.countDocuments(query);
    }

    // TODO: We need to come back to this duplication
    public async countDoc(): Promise<number | null> {
        return User.countDocuments();
    }

    public async deleteAll(): Promise<IUserDocument | null | any> {
        return User.deleteMany({});
    }

    public async getOne(
        query: FilterQuery<IUserDocument>
    ): Promise<IUserDocument | null> {
        return User.findOne(query);
    }
}

export default new UserRepository();
