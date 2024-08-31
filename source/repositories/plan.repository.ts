import { Types } from 'mongoose';
import { IInvestmentCategory, IPlanDocument, IPortfolioOccurrence } from '../interfaces/plan.interface';
import { Plan } from '../models';
import UtilFunctions, { convertDate, format_query_decimal, getDaysDate, repoInvestmentCategory, repoPagination, repoPlanType, repoSearch, repoTime } from '../util';
import { ExpressRequest } from '../server';
import moment from 'moment';
import { IInvestmentStatus } from '../interfaces/investment.interface';
import { FilterQuery } from 'mongoose';

class PlanRepository {
  // Function to create plan
  public async create({
    investment_category,
    user_id,
    no_tokens,
    listing_id,
    total_amount,
    plan_name,
    goal_name,
    goal_target,
    intervals,
    amount,
    plan_occurrence,
    duration,
    end_date,
    start_date,
    plan_category,
    next_charge_date,
    session,
  }: {
    investment_category?: string;
    user_id?: Types.ObjectId;
    no_tokens?: number;
    listing_id?: Types.ObjectId;
    total_amount: number;
    plan_name?: number;
    goal_name?: string;
    goal_target?: number;
    intervals: string;
    amount: number;
    plan_occurrence: string;
    duration: number;
    end_date: Date;
    start_date: Date;
    plan_category: string;
    next_charge_date: Date;
    session: any;
  }): Promise<IPlanDocument | null | any> {
    const data = {
      investment_category,
      user_id,
      no_tokens,
      listing_id,
      total_amount,
      plan_name,
      goal_name,
      goal_target,
      intervals,
      amount,
      plan_occurrence,
      duration,
      end_date,
      start_date,
      plan_category,
      next_charge_date,
    };

    const plan = await Plan.create([data], { session });

    return plan;
  }

  // Function to create plan migrated from v1
  public async createMigrate({
    user_id,
    no_tokens,
    listing_id,
    total_amount,
    plan_name,
    plan_status,
    amount,
    plan_currency,
    plan_occurrence,
    duration,
    end_date,
    start_date,
    plan_category,
    createdAt,
    updatedAt,
  }: {
    user_id?: Types.ObjectId;
    no_tokens?: number;
    listing_id?: Types.ObjectId;
    total_amount: number;
    plan_name?: string;
    plan_currency?: string;
    plan_status: string;
    amount: number;
    plan_occurrence: string;
    duration: number;
    end_date: Date;
    start_date: Date;
    plan_category: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<IPlanDocument | null | any> {
    const data = {
      user_id,
      no_tokens,
      listing_id,
      total_amount,
      plan_name,
      plan_status,
      plan_currency,
      amount,
      plan_occurrence,
      duration,
      end_date,
      start_date,
      plan_category,
      createdAt,
      updatedAt,
    };

    const plan = await Plan.create(data);

    return plan;
  }

  // Function to get plan based on the query object provided
  public async getOne(query: FilterQuery<IPlanDocument>): Promise<IPlanDocument | null> {
    return Plan.findOne(query);
  }

  // Function to get all plan based on the query object provided
  public async getAll(query: FilterQuery<IPlanDocument>): Promise<IPlanDocument[] | null | any> {
    return Plan.find(query);
  }

  // Function to update plan based on the plan_id and record object provided
  public async atomicUpdate(plan_id: Types.ObjectId, record: any, session: any = null) {
    return Plan.findOneAndUpdate({ _id: plan_id }, { ...record }, { new: true, session });
  }

  // Function to get all plans
  public async find(req: ExpressRequest, user_id: any): Promise<IPlanDocument | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format

    // Add createdAt, user_id to the filter query object
    const filterQuery = {
      createdAt: { $gte: myDateFrom, $lte: myDateTo },
      user_id: user_id,
    };

    // Get the plan documents from the database
    const plan = await Plan.find(filterQuery)
      .limit(perpage)
      .skip(page * perpage - perpage);

    // Get total of plan documents
    const total = await Plan.countDocuments(filterQuery);

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

  // Function to get all plans given the query pipeline passed
  public async findV3(req: ExpressRequest, user_id: any): Promise<IPlanDocument | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    const search = String(query.search); // Set the string for searching
    const skip = page * perpage - perpage; //calculate and set the page skip number

    let searchQuery = {}; // Initialize the search query object

    // Check if there is a search string and add it to the search query object
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      searchQuery = {
        $or: [{ plan_name: new RegExp(search, 'i') }],
      };
    }

    // Add searchQuery, user_id, createdAt to the filter object
    const filterQuery = {
      createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
      user_id: user_id,
      ...searchQuery,
    };

    // Get the plan documents from the database
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
          from: 'investments',
          localField: 'investments',
          foreignField: '_id',
          as: 'investment',
        },
      },

      {
        $unwind: {
          path: '$investment',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'listings',
          localField: 'investment.listing_id',
          foreignField: '_id',
          as: 'listing',
        },
      },

      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          assets: {
            $cond: {
              if: { $eq: ['$listing._id', '$investment.listing_id'] },
              then: '$listing._id',
              else: ['$listing._id', '$investment.listing_id'],
            },
          },
        },
      },

      {
        $group: {
          _id: { listing_id: '$listing._id', investment_id: '$investment._id' },
          plan_id: { $first: '$_id' },
          plan_name: { $first: '$plan_name' },
          plan_currency: { $first: '$plan_currency' },
          createdAt: { $first: '$createdAt' },
          plan_occurrence: { $first: '$plan_occurrence' },
          no_tokens: { $first: '$no_tokens' },
          listing: { $push: '$listing' },
          investment: { $push: '$investment' },
          assets: { $addToSet: '$assets' },
        },
      },

      {
        $unwind: '$listing',
      },

      {
        $unwind: '$investment',
      },

      {
        $project: {
          plan_id: 1,
          plan_name: 1,
          createdAt: 1,
          plan_occurrence: 1,
          plan_currency: 1,
          assets: 1,
          no_tokens: 1,
          investment: 1,
          listing: 1,

          current_returns: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$listing._id', '$investment.listing_id'] },
                  { $eq: ['$investment.investment_status', IInvestmentStatus.INVESTMENT_MATURED] },
                ],
              },
              then: format_query_decimal(
                {
                  $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
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
                          $subtract: ['$$NOW', '$investment.start_date'],
                        },

                        // Completed Date
                        {
                          $subtract: ['$investment.end_date', '$investment.start_date'],
                        },
                      ],
                    },
                    {
                      $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
                    },
                  ],
                },
                1000
              ),
            },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $group: {
          _id: '$plan_id',
          current_returns: { $sum: '$current_returns' },
          plan_currency: { $first: '$plan_currency' },
          assets: { $first: '$assets' },
          plan_name: { $first: '$plan_name' },
          plan_occurrence: { $first: '$plan_occurrence' },
          no_tokens: { $first: '$no_tokens' },
          total_amount: { $sum: '$investment.amount' },
          holding_period: { $first: '$listing.holding_period' },
          createdAt: { $first: '$createdAt' },
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
          current_returns: format_query_decimal('$current_returns', 100),
          current_value: format_query_decimal({ $add: ['$current_returns', '$total_amount'] }, 100),
          assets: { $size: '$assets' },
          plan_currency: 1,
          plan_name: 1,
          total_amount: format_query_decimal('$total_amount', 100),
          createdAt: 1,
          holding_period: 1,
        },
      },
    ];

    const plan = await this.findAggregate(plan_pipeline);

    // Get total of plan documents
    const total = await this.countDocs(filterQuery);

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return {
      data: plan,
      pagination
    }
  }

  // Function to get all fixed plans given the query pipeline passed
  public async findFixed(req: ExpressRequest, user_id: any): Promise<IPlanDocument | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    const search = String(query.search); // Set the string for searching
    const skip = page * perpage - perpage; //calculate and set the page skip number

    let searchQuery = {}; // Initialize the search query object

    // Check if there is a search string and add it to the search query object
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      searchQuery = {
        $or: [{ plan_name: new RegExp(search, 'i') }],
      };
    }

    // Add searchQuery, user_id, createdAt to the filter object
    const filterQuery = {
      createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
      user_id: user_id,
      investment_category: IInvestmentCategory.FIXED,
      ...searchQuery,
    };

    // Get the plan documents from the database
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
          from: 'investments',
          localField: 'investments',
          foreignField: '_id',
          as: 'investment',
        },
      },

      {
        $unwind: {
          path: '$investment',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'listings',
          localField: 'investment.listing_id',
          foreignField: '_id',
          as: 'listing',
        },
      },

      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          assets: {
            $cond: {
              if: { $eq: ['$listing._id', '$investment.listing_id'] },
              then: '$listing._id',
              else: ['$listing._id', '$investment.listing_id'],
            },
          },
        },
      },

      {
        $group: {
          _id: { listing_id: '$listing._id', investment_id: '$investment._id' },
          plan_id: { $first: '$_id' },
          plan_name: { $first: '$plan_name' },
          plan_currency: { $first: '$plan_currency' },
          createdAt: { $first: '$createdAt' },
          plan_occurrence: { $first: '$plan_occurrence' },
          no_tokens: { $first: '$no_tokens' },
          listing: { $push: '$listing' },
          investment: { $push: '$investment' },
          assets: { $addToSet: '$assets' },
        },
      },

      {
        $unwind: '$listing',
      },

      {
        $unwind: '$investment',
      },

      {
        $project: {
          plan_id: 1,
          plan_name: 1,
          createdAt: 1,
          plan_occurrence: 1,
          plan_currency: 1,
          assets: 1,
          no_tokens: 1,
          investment: 1,
          listing: 1,

          current_returns: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$listing._id', '$investment.listing_id'] },
                  { $eq: ['$investment.investment_status', IInvestmentStatus.INVESTMENT_MATURED] },
                ],
              },
              then: format_query_decimal(
                {
                  $multiply: [
                    '$investment.amount',
                    { $divide: ['$listing.returns', 100] },
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
                          $subtract: ['$$NOW', '$investment.start_date'],
                        },

                        // Completed Date
                        {
                          $subtract: ['$investment.end_date', '$investment.start_date'],
                        },
                      ],
                    },
                    {
                      $multiply: [
                        '$investment.amount',
                        { $divide: ['$listing.returns', 100] },
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
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $group: {
          _id: '$plan_id',
          current_returns: { $sum: '$current_returns' },
          // cash_dividends: { $sum: '$cash_dividends' },
          plan_currency: { $first: '$plan_currency' },
          assets: { $first: '$assets' },
          plan_name: { $first: '$plan_name' },
          plan_occurrence: { $first: '$plan_occurrence' },
          no_tokens: { $first: '$no_tokens' },
          total_amount: { $sum: '$investment.amount' },
          holding_period: { $first: '$listing.holding_period' },
          createdAt: { $first: '$createdAt' },
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
          current_returns: format_query_decimal('$current_returns', 100),
          current_value: format_query_decimal(
            { $add: ['$current_returns', '$total_amount'] },
            100
          ),
          assets: { $size: '$assets' },
          plan_currency: 1,
          plan_name: 1,
          total_amount: format_query_decimal('$total_amount', 100),
          createdAt: 1,
          holding_period: 1,
        },
      },
    ];

    const plan = await this.findAggregate(plan_pipeline);

    // Get total of plan documents
    const total = await this.countDocs(filterQuery);

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return {
      data: plan,
      pagination
    }
  }

  // Get all user's plans based on filter query passed
  public async getAllUserPlans(filter: any): Promise<IPlanDocument[] | null | any> {
    return Plan.find({ ...filter });
  }

  // Get all user's plans
  public async getUserPlans(
    req: ExpressRequest,
    user_id: Types.ObjectId
  ): Promise<IPlanDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search) || ''; // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    let period = String(query.period) || 'today'; // Set the period
    let timeFilter = {}; // Initialize the time filter object
    let filter = {}; // Initialize the filter object
    let days; // Initialize the days variable

    let filterQuery = {}; // Initialize the filter query object

    const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
    const current_date = new Date(); // Get the current date

    // Check if there is a search string and add it to the filter query object also Check if period is custom and set filter query accordingly
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      filterQuery = {
        $or: [
          { first_name: new RegExp(search, 'i') },
          { last_name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      };
    } else if (period === 'custom') {
      filterQuery = {
        createdAt: { $gte: myDateFrom, $lte: myDateTo },
      };
    } else if (period === 'today') {
      timeFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (period === '7days') {
      days = await UtilFunctions.subtractDays(7);
      timeFilter = {
        createdAt: { $gte: days, $lte: current_date },
      };
    } else if (period === '30days') {
      days = await UtilFunctions.subtractDays(30);
      timeFilter = {
        createdAt: { $gte: days, $lte: current_date },
      };
    } else if (period === '90days') {
      days = await UtilFunctions.subtractDays(90);
      timeFilter = {
        createdAt: { $gte: days, $lte: current_date },
      };
    }

    // Add timeFilter, filterQuery and user_id to the filter object
    filter = { ...filterQuery, ...timeFilter, user_id: user_id };

    // Get the plan documents from the database
    const plans = await Plan.find(filter)
      .populate({
        path: 'listing_id',
        select: 'project_name',
      })
      .sort({ createdAt: -1 })
      .limit(perpage)
      .skip(page * perpage - perpage);

    // Get total of plan document
    const total = await Plan.countDocuments(filter);

    return Promise.resolve({
      data: plans,
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

  // Get all plans based on the query parameter passed
  public async findV2(query: any, select: any = ''): Promise<IPlanDocument | null | any> {
    return Plan.find(query).select(select);
  }

  // Get all plans
  public async findV4(req: ExpressRequest, user_id: any): Promise<IPlanDocument | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const skip = page * perpage - perpage; //calculate and set the page skip number
    let period = String(query.period) || '90days'; // Set the period for filtering
    let plan_type = String(query.plan_type) || 'all'; // Set the plan_type for filtering
    let investment_category = String(query.investment_category) || 'all'; // Set the plan_type for filtering

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });
    const plan_typeFilter = repoPlanType({ plan_type: plan_type });
    const investment_categoryFilter = repoInvestmentCategory({ investment_category: investment_category });

    // Add timeFilter, user_id, plan_typeFilter to the filter object
    const filter = { ...timeFilter, ...investment_categoryFilter, user_id: user_id, ...plan_typeFilter };

    // Get the plan documents from the database
    const plan_pipeline = [
      {
        $match: filter,
      },
      { $skip: skip },
      { $limit: perpage },

      {
        $lookup: {
          from: 'investments',
          localField: 'investments',
          foreignField: '_id',
          as: 'investment',
        },
      },

      {
        $unwind: {
          path: '$investment',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'listings',
          localField: 'investment.listing_id',
          foreignField: '_id',
          as: 'listing',
        },
      },

      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          assets: {
            $cond: {
              if: { $eq: ['$listing._id', '$investment.listing_id'] },
              then: '$listing._id',
              else: ['$listing._id', '$investment.listing_id'],
            },
          },
        },
      },

      {
        $group: {
          _id: { listing_id: '$listing._id', investment_id: '$investment._id' },
          plan_id: { $first: '$_id' },
          plan_name: { $first: '$plan_name' },
          createdAt: { $first: '$createdAt' },
          plan_occurrence: { $first: '$plan_occurrence' },
          plan_status: { $first: '$plan_status' },
          investment_category: { $first: '$investment_category' },
          no_tokens: { $first: '$no_tokens' },
          listing: { $push: '$listing' },
          investment: { $push: '$investment' },
          assets: { $addToSet: '$assets' },
        },
      },

      {
        $unwind: '$listing',
      },

      {
        $unwind: '$investment',
      },

      {
        $project: {
          _id: 0,
          plan_id: 1,
          plan_name: 1,
          createdAt: 1,
          plan_occurrence: 1,
          plan_status: 1,
          investment_category: 1,
          assets: 1,
          no_tokens: 1,
          currency: '$investment.investment_currency',

          current_returns: format_query_decimal(
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $dateDiff: {
                        startDate: '$investment.start_date',
                        endDate: '$$NOW',
                        unit: 'second',
                      },
                    },
                    {
                      $dateDiff: {
                        startDate: '$investment.start_date',
                        endDate: '$investment.end_date',
                        unit: 'second',
                      },
                    },
                  ],
                },
                { $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }] },
              ],
            },
            1000
          ),

          current_value: format_query_decimal(
            {
              $add: [
                '$investment.amount',
                {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$listing._id', '$listing_id'] },
                        { $eq: ['$investment.investment_status', IInvestmentStatus.INVESTMENT_MATURED] },
                      ],
                    },
                    then: format_query_decimal(
                      {
                        $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
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
                                $subtract: ['$$NOW', '$investment.start_date'],
                              },

                              // Completed Date
                              {
                                $subtract: ['$investment.end_date', '$investment.start_date'],
                              },
                            ],
                          },
                          {
                            $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
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

          investment: 1,
          listing: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $group: {
          _id: '$plan_id',
          current_returns: { $sum: '$current_returns' },
          current_value: { $sum: '$current_value' },
          assets: { $first: '$assets' },
          plan_name: { $first: '$plan_name' },
          plan_status: { $first: '$plan_status' },
          plan_occurrence: { $first: '$plan_occurrence' },
          investment_category: { $first: '$investment_category' },
          no_tokens: { $first: format_query_decimal('$no_tokens', 100) },
          total_amount: { $sum: format_query_decimal('$investment.amount', 100) },
          holding_period: { $first: '$listing.holding_period' },
          createdAt: { $first: '$createdAt' },
          currency: { $first: '$investment.investment_currency' },
        },
      },

      {
        $project: {
          _id: 1,
          current_returns: 1,
          current_value: 1,
          assets: { $size: '$assets' },
          plan_name: 1,
          plan_occurrence: 1,
          plan_status: 1,
          investment_category: 1,
          no_tokens: 1,
          total_amount: 1,
          createdAt: 1,
          holding_period: 1,
          currency: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const plan = await this.findAggregate(plan_pipeline);

    // Get total of plan documents
    const total = await this.countDocs(filter);

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { data: plan, pagination };
  }

  // Get all plans (Export)
  public async findV4NoPagination(
    req: ExpressRequest,
    user_id: any
  ): Promise<IPlanDocument | null | any> {
    const { query } = req; // Get the query params from the request object
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    let plan_type = String(query.plan_type) || 'all'; // Set the plan_type for filtering
    let investment_category = String(query.investment_category) || 'all'; // Set the plan_type for filtering

    const plan_typeFilter = repoPlanType({ plan_type: plan_type });
    const investment_categoryFilter = repoInvestmentCategory({ investment_category: investment_category });

    // Add createdAt, user_id to the filter query object
    const filterQuery = {
      createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
      user_id: user_id,
      ...investment_categoryFilter,
      ...plan_typeFilter
    };

    // Get the plan documents from the database
    const plan_pipeline = [
      {
        $match: filterQuery,
      },

      {
        $lookup: {
          from: 'investments',
          localField: 'investments',
          foreignField: '_id',
          as: 'investment',
        },
      },

      {
        $unwind: {
          path: '$investment',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'listings',
          localField: 'investment.listing_id',
          foreignField: '_id',
          as: 'listing',
        },
      },

      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          assets: {
            $cond: {
              if: { $eq: ['$listing._id', '$investment.listing_id'] },
              then: '$listing._id',
              else: ['$listing._id', '$investment.listing_id'],
            },
          },
        },
      },

      {
        $group: {
          _id: { listing_id: '$listing._id', investment_id: '$investment._id' },
          plan_id: { $first: '$_id' },
          plan_name: { $first: '$plan_name' },
          createdAt: { $first: '$createdAt' },
          plan_occurrence: { $first: '$plan_occurrence' },
          plan_status: { $first: '$plan_status' },
          investment_category: { $first: '$investment_category' },          no_tokens: { $first: '$no_tokens' },
          listing: { $push: '$listing' },
          investment: { $push: '$investment' },
          assets: { $addToSet: '$assets' },
        },
      },

      {
        $unwind: '$listing',
      },

      {
        $unwind: '$investment',
      },

      {
        $project: {
          _id: 0,
          plan_id: 1,
          plan_name: 1,
          createdAt: 1,
          plan_occurrence: 1,
          plan_status: 1,
          investment_category: 1,
          assets: 1,
          no_tokens: 1,
          currency: '$investment.investment_currency',

          current_returns: format_query_decimal(
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $dateDiff: {
                        startDate: '$investment.start_date',
                        endDate: '$$NOW',
                        unit: 'second',
                      },
                    },
                    {
                      $dateDiff: {
                        startDate: '$investment.start_date',
                        endDate: '$investment.end_date',
                        unit: 'second',
                      },
                    },
                  ],
                },
                { $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }] },
              ],
            },
            1000
          ),

          current_value: format_query_decimal(
            {
              $add: [
                '$investment.amount',
                {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$listing._id', '$listing_id'] },
                        { $eq: ['$investment.investment_status', IInvestmentStatus.INVESTMENT_MATURED] },
                      ],
                    },
                    then: format_query_decimal(
                      {
                        $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
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
                                $subtract: ['$$NOW', '$investment.start_date'],
                              },

                              // Completed Date
                              {
                                $subtract: ['$investment.end_date', '$investment.start_date'],
                              },
                            ],
                          },
                          {
                            $multiply: ['$investment.amount', { $divide: ['$listing.returns', 100] }],
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

          investment: 1,
          listing: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $group: {
          _id: '$plan_id',
          current_returns: { $sum: '$current_returns' },
          current_value: { $sum: '$current_value' },
          assets: { $first: '$assets' },
          plan_name: { $first: '$plan_name' },
          plan_status: { $first: '$plan_status' },
          plan_occurrence: { $first: '$plan_occurrence' },
          investment_category: { $first: '$investment_category' },
          no_tokens: { $first: format_query_decimal('$no_tokens', 100) },
          total_amount: { $sum: format_query_decimal('$investment.amount', 100) },
          holding_period: { $first: '$listing.holding_period' },
          createdAt: { $first: '$createdAt' },
          currency: { $first: '$investment.investment_currency' },
        },
      },

      {
        $project: {
          _id: 1,
          current_returns: 1,
          current_value: 1,
          assets: { $size: '$assets' },
          plan_name: 1,
          plan_occurrence: 1,
          plan_status: 1,
          investment_category: 1,
          no_tokens: 1,
          total_amount: 1,
          created_date: {
            $dateToString: {
              format: '%Y-%m-%d', // Format string based on your requirements
              date: '$createdAt', // Replace 'dateField' with your actual field name containing the date
            },
          },
          created_time: {
            $dateToString: {
              format: '%H:%M:%S', // Format string based on your requirements
              date: '$createdAt', // Replace 'dateField' with your actual field name containing the date
            },
          },
          holding_period: 1,
          currency: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const plan = await this.findAggregate(plan_pipeline);

    return plan;
  }

  // Get the aggregated plans based on query object passed
  public async findAggregate(query: any): Promise<IPlanDocument[] | null> {
    return Plan.aggregate(query);
  }

  // Get the count of plan documents
  public async countDocs(query: any): Promise<IPlanDocument | null | any> {
    return Plan.countDocuments({ ...query });
  }

  /************************
   ************************
   ************************
   ************************
   ************************
   *
   *
   *
   * PAYMENT STYLE CHART
   *
   *
   */
  public async findPaymentStyleChart({
    req,
  }: {
    req: ExpressRequest;
  }): Promise<IPlanDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const payment_style = String(query.payment_style); // Set the payment style
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    let period = String(query.period) || ''; // Set the period for filtering
    let timeFilter; // Initialize the time filter variable
    let paymentStyleQuery = {}; // Initialize the payment style query object

    // Check if there is a payment style and add it to the payment style query object
    if (payment_style == IPortfolioOccurrence.All) {
      paymentStyleQuery = {};
    } else {
      paymentStyleQuery = { plan_occurrence: payment_style };
    }

    // Check if period is custom and set filter query accordingly
    if (period === 'custom') {
      timeFilter = getDaysDate(moment(myDateFrom).format(), moment(myDateTo).format());
    } else if (period === '7days') {
      timeFilter = getDaysDate(moment().subtract(6, 'days'), moment());
    } else if (period === '30days') {
      timeFilter = getDaysDate(moment().subtract(29, 'days'), moment());
    } else if (period === '90days') {
      timeFilter = getDaysDate(moment().subtract(89, 'days'), moment());
    }

    // Get the plan documents from the database
    const payment_style_pipeline = [
      { $match: { ...paymentStyleQuery } },
      { $project: { plan_occurrence: 1, date: { $substr: ['$createdAt', 0, 10] } } },
      {
        $group: {
          _id: {
            date: '$date',
            plan_occurrence: '$plan_occurrence',
          },
          count: { $sum: 1 },
          data: { $push: '$$ROOT' },
        },
      },
      { $unwind: '$data' },

      {
        $group: {
          _id: {
            plan_occurrence: '$_id.plan_occurrence',
          },
          data: {
            $push: {
              date: '$_id.date',
              count: '$count',
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
              as: 'e',
              in: {
                $let: {
                  vars: {
                    dateIndex: { $indexOfArray: ['$data.date', '$$e'] },
                  },
                  in: {
                    $cond: {
                      if: { $ne: ['$$dateIndex', -1] },
                      then: {
                        date: '$$e',
                        value: { $arrayElemAt: ['$data.count', '$$dateIndex'] },
                      },
                      else: {
                        date: '$$e',
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
          '_id.plan_occurrence': 1,
        },
      },

      {
        $project: {
          _id: 0,
          plan_occurrence: '$_id.plan_occurrence',
          data: '$data',
        },
      },
    ];

    const payment_style_chart = await this.findAggregate(payment_style_pipeline);

    // Return data and pagination information
    return {
      data: payment_style_chart,
    };
  }

  // Get Recent Investments
  public async getRecent(req: ExpressRequest): Promise<IPlanDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    const skip = page * perpage - perpage; // calculate and set the page skip number
    const search = String(query.search); // Set the string for searching

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: ['user.first_name', 'user.middle_name', 'user.last_name', 'user.email'],
    });

    // create the plan pipeline
    const Plan_pipeline = [
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'listings',
          localField: 'listing_id',
          foreignField: '_id',
          as: 'listing',
        },
      },
      { $unwind: '$listing' },
      { $match: { ...searching }},
      {
        $project: {
          first_name: '$user.first_name',
          last_name: '$user.last_name',
          email: '$user.email',
          profile_photo: '$user.profile_photo',
          project_name: '$listing.project_name',
          amount_invested: '$amount',
          plan_occurrence: 1,
          plan_name: 1,
          createdAt: 1,
        },
      },
      { $skip: skip },
      { $limit: perpage },
    ];

    // Get the plan and total documents from the database
    const plan_stat = await this.findAggregate(Plan_pipeline)
    const total = await this.countDocs({ ...searching });

    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return {
      data: plan_stat,
      pagination,
    };
  }

}

// Export PlanRepository
export default new PlanRepository();
