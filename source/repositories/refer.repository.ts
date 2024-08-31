import { Types } from 'mongoose';
import { ExpressRequest } from '../server';
import { User } from '../models';
import { IUserDocument } from '../interfaces/user.interface';
import { format_query_decimal, repoPagination, repoSearch, repoTime } from '../util';
import { RATES } from '../constants/rates.constant';
import { IInvestmentStatus } from '../interfaces/investment.interface';

class ReferRepository {
  // Get all referrals
  public async getAll(req: ExpressRequest): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    let period = String(query.period) || '365days'; // Set the period
    const skip = page * perpage - perpage; // calculate and set the page skip number

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery and referral_count to the filter object
    const filter = { ...searching, ...timeFilter, referral_count: { $gt: 0 } };

    // Get the referrals and total from the database
    const [refers, total] = await Promise.all([
      User.aggregate([
        { $match: filter },

        {
          $lookup: {
            from: 'referwallets',
            localField: '_id',
            foreignField: 'user_id',
            as: 'referwallet',
          },
        },
        { $unwind: { path: '$referwallet', preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'users',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$referred_by', '$$userId'],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  first_name: 1,
                  middle_name: 1,
                  last_name: 1,
                  email: 1,
                  has_invest: 1,
                },
              },
            ],
            as: 'referred_user',
          },
        },

        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            email: 1,
            createdAt: 1,
            referral_count: 1,
            invested_referral: {
              $size: {
                $filter: {
                  input: '$referred_user',
                  as: 'referredUser',
                  cond: { $eq: ['$$referredUser.has_invest', true] },
                },
              },
            },
            amount_earned: format_query_decimal('$referwallet.balance', 100),
          },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: perpage },
      ]),
      User.countDocuments(filter),
    ]);

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: refers, pagination };
  }

  // Get all referrals - No pagination
  public async getAllNoPagination(req: ExpressRequest): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    let period = String(query.period) || 'all'; // Set the period for filtering

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, searching and referral_count to the filter object
    const filter = { ...searching, ...timeFilter, referral_count: { $gt: 0 } };

    // Get the referrals documents from the database
    const [refers] = await Promise.all([
      User.aggregate([
        { $match: filter },

        {
          $lookup: {
            from: 'referwallets',
            localField: '_id',
            foreignField: 'user_id',
            as: 'referwallet',
          },
        },
        { $unwind: { path: '$referwallet', preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'users',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$referred_by', '$$userId'],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  first_name: 1,
                  middle_name: 1,
                  last_name: 1,
                  email: 1,
                  has_invest: 1,
                },
              },
            ],
            as: 'referred_user',
          },
        },

        {
          $project: {
            first_name: 1,
            last_name: 1,
            email: 1,
            createdAt: 1,
            referral_count: 1,
            invested_referral: {
              $size: {
                $filter: {
                  input: '$referred_user',
                  as: 'referredUser',
                  cond: { $eq: ['$$referredUser.has_invest', true] },
                },
              },
            },
            amount_earned: format_query_decimal('$referwallet.balance', 100),
          },
        },

        { $sort: { createdAt: -1 } },
      ]),
    ]);

    // return referrals data
    return refers;
  }

  // Get all referrals - No pagination
  public async getAllReferralNoPagination(req: ExpressRequest): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const has_invest = String(query.has_invest); // Set the investment boolean
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    let period = String(query.period) || '365days'; // Set the period for filtering
    let has_investQuery = {};

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });

    // Check if there is a has_invest and add it to the has_invest query object
    if (has_invest === 'all') {
      has_investQuery = {};
    } else if (has_invest === 'true'){
      has_investQuery = { "referred_user.has_invest": true };
    } else {
      has_investQuery = { "referred_user.has_invest": false };
    }

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, searching and referral_count to the filter object
    const filter = { ...searching, ...timeFilter, ...has_investQuery, referral_count: { $gt: 0 } };

    // Get the referrals documents from the database
    const [refers] = await Promise.all([
      User.aggregate([
        {
          $lookup: {
            from: 'users',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$referred_by', '$$userId'],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  first_name: 1,
                  middle_name: 1,
                  last_name: 1,
                  email: 1,
                  has_invest: 1,
                },
              },
            ],
            as: 'referred_user',
          },
        },
        { $unwind: { path: '$referred_user', preserveNullAndEmptyArrays: true } },

        { $match: filter },

        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            email: 1,
            referral_count: 1,
            referred_user: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              email: 1,
              has_invest: 1,
            },
          },
        },

        { $sort: { createdAt: -1 } },

      ]),
    ]);

    // return referrals data
    return refers;
  }

  // Get the count of refer documents
  public async countDocs(query: any): Promise<IUserDocument | null | any> {
    return User.countDocuments({ ...query });
  }

  // Get all referrals
  public async getAllReferral(req: ExpressRequest): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const has_invest = String(query.has_invest); // Set the investment boolean
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const skip = page * perpage - perpage; // calculate and set the page skip number
    let period = String(query.period) || '365days'; // Set the period for filtering

    let has_investQuery = {};

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });

    // Check if there is a has_invest and add it to the has_invest query object
    if (has_invest === 'all') {
      has_investQuery = {};
    } else if (has_invest === 'true'){
      has_investQuery = { "referred_user.has_invest": true };
    } else {
      has_investQuery = { "referred_user.has_invest": false };
    }

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, searching and referral_count to the filter object
    const filter = { ...searching, ...timeFilter, ...has_investQuery, referral_count: { $gt: 0 } };

    // Get the referrals documents from the database
    const [refers] = await Promise.all([
      User.aggregate([

        {
          $lookup: {
            from: 'users',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$referred_by', '$$userId'],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  first_name: 1,
                  middle_name: 1,
                  last_name: 1,
                  email: 1,
                  has_invest: 1,
                },
              },
            ],
            as: 'referred_user',
          },
        },
        { $unwind: { path: '$referred_user', preserveNullAndEmptyArrays: true } },

        { $match: filter },

        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            email: 1,
            referral_count: 1,
            referred_user: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              email: 1,
              has_invest: 1,
            },
          },
        },

        { $sort: { createdAt: -1 } },
        { $limit: perpage },
        { $skip: skip },
      ]),
    ]);

    const total = await this.countDocs( filter );

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: refers, pagination };
  }

  // Get all user referrals
  public async getAllUserReferrals(req: ExpressRequest): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let status = String(query.status) || ''; // Set the status for filtering
    const skip = page * perpage - perpage; // calculate and set the page skip number
    let has_invest; // Initialize the has_invest variable
    const refer_id = new Types.ObjectId(req.params.refer_id); // Set the refer id

    // Check if status is pending and set has_invest accordingly
    if (status == 'pending') {
      has_invest = false;
    } else if (status == 'invested') {
      has_invest = true;
    } else {
      has_invest = { $in: [true, false] };
    }

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });

    // Add referred_by, filterQuery and has_invest to the filter object
    const filter = { referred_by: refer_id, ...searching, has_invest };

    // Get the referrals and total documents from the database
    const [refers, total] = await Promise.all([
      User.aggregate(
        [
          { $match: filter },

          {
            $lookup: {
              from: 'investments',
              let: { referredUserId: '$_id' }, // Create a variable to hold the referred user's _id
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$user_id', '$$referredUserId'] }, // Match investments by user_id
                  },
                },
              ],
              as: 'investment',
            },
          },
          { $unwind: { path: '$investment', preserveNullAndEmptyArrays: true } },

          {
            $group: {
              _id: '$_id',
              first_name: { $first: '$first_name' },
              middle_name: { $first: '$middle_name' },
              last_name: { $first: '$last_name' },
              email: { $first: '$email' },
              has_invest: { $first: '$has_invest' },
              createdAt: { $first: '$createdAt' },
              investment: { $first: '$investment' },
            },
          },

          {
            $lookup: {
              from: 'listings',
              let: { listingId: '$investment.listing_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$listingId'] },
                  },
                },
              ],
              as: 'listing',
            },
          },
          { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              email: 1,
              createdAt: 1,
              has_invest: 1,
              investment_amount: format_query_decimal('$investment.amount', 100),
              investment_category: '$investment.investment_category',

              current_returns: {
                $cond: {
                    if: {
                        $and: [
                            { $eq: ["$listing._id", "$investment.listing_id"] },
                            {
                                $eq: [
                                    "$investment.investment_status",
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                ],
                            },
                        ],
                    },
                    then: format_query_decimal(
                        {
                            $multiply: [
                                "$investment.amount",
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
                                                "$investment.start_date",
                                            ],
                                        },

                                        // Completed Date
                                        {
                                            $subtract: [
                                                "$investment.end_date",
                                                "$investment.start_date",
                                            ],
                                        },
                                    ],
                                },
                                {
                                    $multiply: [
                                        "$investment.amount",
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

            },
          },

          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: perpage },
        ]
      ),
      User.countDocuments(filter),
    ]);

    // Create pagination object
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: refers, pagination };
  }

  // Get all users referrals - No pagination
  public async getAllUserReferralsNoPagination(
    req: ExpressRequest
  ): Promise<IUserDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const refer_id = new Types.ObjectId(req.params.refer_id); // Set the refer id
    let status = String(query.status) || ''; // Set the status for filtering

    // Set default date range if not provided
    const dateFrom = query.dateFrom || "Jan 1 2021";
    const dateTo = query.dateTo || `${Date()}`;
    let period = String(query.period) || "all";

    let has_invest; // Initialize the has_invest variable

    // Check if status is pending and set has_invest accordingly
    if (status == 'pending') {
      has_invest = false;
    } else if (status == 'invested') {
      has_invest = true;
    } else {
      has_invest = { $in: [true, false] };
    }

    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['first_name', 'middle_name', 'last_name', 'email'],
    });
    // Add has_invest, referred_by and filterQuery to the filter object
    const filter = { referred_by: refer_id, ...searching, has_invest, ...timeFilter };

    // Get the plan documents from the database
    const [refers] = await Promise.all([
      User.aggregate(
        [
          { $match: filter },

          {
            $lookup: {
              from: 'investments',
              let: { referredUserId: '$_id' }, // Create a variable to hold the referred user's _id
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$user_id', '$$referredUserId'] }, // Match investments by user_id
                  },
                },
              ],
              as: 'investment',
            },
          },
          { $unwind: { path: '$investment', preserveNullAndEmptyArrays: true } },

          {
            $group: {
              _id: '$_id',
              first_name: { $first: '$first_name' },
              middle_name: { $first: '$middle_name' },
              last_name: { $first: '$last_name' },
              email: { $first: '$email' },
              has_invest: { $first: '$has_invest' },
              createdAt: { $first: '$createdAt' },
              investment: { $first: '$investment' },
            },
          },

          {
            $lookup: {
              from: 'listings',
              let: { listingId: '$investment.listing_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$listingId'] },
                  },
                },
              ],
              as: 'listing',
            },
          },
          { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

          {
            $project: {
              first_name: 1,
              middle_name: 1,
              last_name: 1,
              email: 1,
              created_date: {
                $dateToString: {
                  format: "%Y-%m-%d", // Format string based on your requirements
                  date: "$createdAt" // Replace 'dateField' with your actual field name containing the date
                }
              },
              created_time: {
                $dateToString: {
                  format: "%H:%M:%S", // Format string based on your requirements
                  date: "$createdAt" // Replace 'dateField' with your actual field name containing the date
                }
              },
              has_invest: 1,
              investment_amount: format_query_decimal('$investment.amount', 100),
              investment_category: '$investment.investment_category',

              current_returns: {
                $cond: {
                    if: {
                        $and: [
                            { $eq: ["$listing._id", "$investment.listing_id"] },
                            {
                                $eq: [
                                    "$investment.investment_status",
                                    IInvestmentStatus.INVESTMENT_MATURED,
                                ],
                            },
                        ],
                    },
                    then: format_query_decimal(
                        {
                            $multiply: [
                                "$investment.amount",
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
                                                "$investment.start_date",
                                            ],
                                        },

                                        // Completed Date
                                        {
                                            $subtract: [
                                                "$investment.end_date",
                                                "$investment.start_date",
                                            ],
                                        },
                                    ],
                                },
                                {
                                    $multiply: [
                                        "$investment.amount",
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

            },
          },

          { $sort: { createdAt: -1 } },
        ]
      ),
    ]);

    // Return referral data
    return refers;
  }

  /************************
   ************************
   ************************
   ************************
   ************************
   *
   *
   *
   * Referral Chart
   */

  public async referChart({
    req,
    user_id,
  }: {
    req: ExpressRequest;
    user_id: Types.ObjectId;
  }): Promise<IUserDocument[] | null | any> {
    const filter = { referred_by: user_id };

    // Get referral chart data from database
    const user_chart_pipeline = [
      { $match: filter },
      {
        $group: {
          _id: {
            date: {
              $substr: ['$createdAt', 0, 7],
            },
            email: '$email',
          },
          signed_up: { $sum: 1 },
          has_invest: { $sum: { $cond: ['$has_invest', 1, 0] } },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          signed_up: { $sum: '$signed_up' },
          has_invest: { $sum: '$has_invest' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          signed_up: '$signed_up',
          has_invest: '$has_invest',
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ];

    const user_chart = await this.findAggregate(user_chart_pipeline);

    // return referral chart
    return user_chart;
  }

  // Get all aggregated referrals data based on the query object parameter passed
  public async findAggregate(query: any): Promise<IUserDocument[] | null> {
    return User.aggregate(query);
  }
}

// Export ReferRepository
export default new ReferRepository();
