import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { ExchangeRate } from '../models';
import { ExpressRequest } from '../server';
import UtilFunctions, { convertDate, repoPagination, repoSearch, repoTime } from '../util';
import { IExchangeRateDocument } from '../interfaces/exchange-rate.interface';

class ExchangeRateRepository {
  // Create Exchange Rate
  public async create({
    ngn_usd_buy_rate,
    ngn_usd_sell_rate,
    eur_usd_buy_rate,
    eur_usd_sell_rate,
    gbp_usd_buy_rate,
    gbp_usd_sell_rate,
    cad_usd_buy_rate,
    cad_usd_sell_rate,
    created_by,
  }: {
    ngn_usd_buy_rate: number;
    ngn_usd_sell_rate: number;
    eur_usd_buy_rate: number;
    eur_usd_sell_rate: number;
    gbp_usd_buy_rate: number;
    gbp_usd_sell_rate: number;
    cad_usd_buy_rate: number;
    cad_usd_sell_rate: number;
    created_by: Types.ObjectId;
  }): Promise<IExchangeRateDocument | null | any> {
    const data = {
      ngn_usd_buy_rate,
      ngn_usd_sell_rate,
      eur_usd_buy_rate,
      eur_usd_sell_rate,
      gbp_usd_buy_rate,
      gbp_usd_sell_rate,
      cad_usd_buy_rate,
      cad_usd_sell_rate,
      created_by,
    };

    return await ExchangeRate.create(data);
  }

  // Get exchange rate based on query object parameters passed
  public async getOne(
    query: FilterQuery<IExchangeRateDocument>,
    populate: string = ""
  ): Promise<IExchangeRateDocument | null> {
      return ExchangeRate.findOne(query).populate(populate).lean(true);
  }

  // Update exchange rate based on exchange_rate_id passed
  public async atomicUpdate(
    query: FilterQuery<IExchangeRateDocument>,
    record: UpdateQuery<IExchangeRateDocument>,
    ): Promise<IExchangeRateDocument | null> {
    return ExchangeRate.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Update all exchange rates based on query and record object parameters passed
  public async batchUpdate(
    query: FilterQuery<IExchangeRateDocument>,
    record: UpdateQuery<IExchangeRateDocument>,
    ): Promise<IExchangeRateDocument | null | any> {
    return ExchangeRate.updateMany({ ...query }, { ...record }, { new: true });
  }

  // Delete exchange rate based on exchange_rate_id passed
  public async delete(query: FilterQuery<IExchangeRateDocument>): Promise<IExchangeRateDocument | null> {
    return ExchangeRate.findByIdAndDelete(query);
  }

  // Get exchange rates
  public async findExchangeRateAdmin(
    req: ExpressRequest
  ): Promise<IExchangeRateDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: [
        'third_party_buy_rate', 'third_party_sell_rate', 'keble_buy_rate', 'keble_sell_rate',
        'ngn_usd_buy_rate', 'ngn_usd_sell_rate', 'eur_usd_buy_rate', 'eur_usd_sell_rate',
        'gbp_usd_buy_rate', 'gbp_usd_sell_rate', 'cad_usd_buy_rate', 'cad_usd_sell_rate'
      ],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

     // Get the transactions from the database
     const exchange_rates = await ExchangeRate.aggregate([
      { $match: filter },
      {
          $project: {
            ngn_usd_buy_rate: {
              $cond: {
                if: { $eq: ["$ngn_usd_buy_rate", 0] }, // Check if ngn_usd_buy_rate is 0
                then: "$keble_buy_rate", // Use keble_buy_rate if it's 0
                else: "$ngn_usd_buy_rate", // Use ngn_usd_buy_rate if it's not 0
              }
            },
            ngn_usd_sell_rate: {
              $cond: {
                if: { $eq: ["$ngn_usd_sell_rate", 0] }, // Check if ngn_usd_sell_rate is 0
                then: "$keble_sell_rate", // Use keble_sell_rate if it's 0
                else: "$ngn_usd_sell_rate", // Use ngn_usd_sell_rate if it's not 0
              }
            },
            is_default: 1,
            eur_usd_buy_rate: 1,
            eur_usd_sell_rate: 1,
            gbp_usd_buy_rate: 1,
            gbp_usd_sell_rate: 1,
            cad_usd_buy_rate: 1,
            cad_usd_sell_rate: 1,
            createdAt: 1,
          },
      },

      { $sort: {
          is_default: -1,
          createdAt: -1
        }
      },
      { $skip: page * perpage - perpage },
      { $limit: perpage },
  ]);

    const total = await this.countDocs(filter);
    const pagination = repoPagination({ page, perpage, total: total! });

    // Return data and pagination information
    return { exchange_rates, pagination };
  }

  public async countDocs(query: FilterQuery<IExchangeRateDocument>): Promise<IExchangeRateDocument | null | any> {
    return ExchangeRate.countDocuments(query);
  }

    // This function finds an aggregate of a given query
  // and returns an array of IUserDocument objects or null
  public async findAggregate(query: any): Promise<IExchangeRateDocument[] | null> {
    // Use the User model to aggregate the given query
    return ExchangeRate.aggregate(query);
  }

  // Get Exchange Rate Document - no pagination
  public async findExchangeNoPagination({
    req,
  }: {
    req: ExpressRequest;
  }): Promise<IExchangeRateDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo
    const myDateFrom = convertDate(dateFrom); // Convert the date to a valid format
    const myDateTo = convertDate(dateTo); // Convert the date to a valid format
    let timeFilter: any = {}; // Initialize the time filter object
    let filterQuery: any = {}; // Initialize the filter query object
    let days; // Initialize the days variable

    const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
    const current_date = new Date(); // Get the current date

    // Check if there is a search string and add it to the search query object
    if (search !== 'undefined' && Object.keys(search).length > 0) {
      filterQuery = {
        $or: [
          { third_party_buy_rate: new RegExp(search, 'i') },
          { third_party_sell_rate: new RegExp(search, 'i') },
          { keble_buy_rate: new RegExp(search, 'i') },
          { keble_sell_rate: new RegExp(search, 'i') },
        ],
      };
    }

    // Check if period is custom and set filter query accordingly
    if (period === 'custom') {
      timeFilter = {
        createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
      };
    } else if (period === 'today') {
      timeFilter = { createdAt: { $gte: new Date(start), $lte: new Date(end) } };
    } else if (period === '7days') {
      days = await UtilFunctions.subtractDays(7);
      timeFilter = {
        createdAt: { $gte: new Date(days), $lte: new Date(current_date) },
      };
    } else if (period === '30days') {
      days = await UtilFunctions.subtractDays(30);
      timeFilter = {
        createdAt: { $gte: new Date(days), $lte: new Date(current_date) },
      };
    } else if (period === '90days') {
      days = await UtilFunctions.subtractDays(90);
      timeFilter = {
        createdAt: { $gte: new Date(days), $lte: new Date(current_date) },
      };
    }

    // Create pipeline for aggregate query
    const exchange_rate_pipeline = [
      { $match: { ...timeFilter, ...filterQuery } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          currency: 1,
          third_party_buy_rate: 1,
          third_party_sell_rate: 1,
          keble_buy_rate: 1,
          keble_sell_rate: 1,
          is_default: 1,
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
        },
      },
    ];

    const exchange_rates = await this.findAggregate(exchange_rate_pipeline);

    // Return exchange_rates information
    return exchange_rates;
  }

  // Get Exchange Rate Document - no pagination
  public async findNewExchangeNoPagination({
    req,
  }: {
    req: ExpressRequest;
  }): Promise<IExchangeRateDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: [
        'ngn_usd_buy_rate', 'ngn_usd_sell_rate', 'eur_usd_buy_rate', 'eur_usd_sell_rate',
        'gbp_usd_buy_rate', 'gbp_usd_sell_rate', 'cad_usd_buy_rate', 'cad_usd_sell_rate'
      ],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Create pipeline for aggregate query
    const exchange_rate_pipeline = [
      { $match: filter },

      { $sort: {
          is_default: -1,
          createdAt: -1
        }
      },

      {
        $project: {
          ngn_usd_buy_rate: {
            $cond: {
              if: { $eq: ["$ngn_usd_buy_rate", 0] }, // Check if ngn_usd_buy_rate is 0
              then: "$keble_buy_rate", // Use keble_buy_rate if it's 0
              else: "$ngn_usd_buy_rate", // Use ngn_usd_buy_rate if it's not 0
            }
          },
          ngn_usd_sell_rate: {
            $cond: {
              if: { $eq: ["$ngn_usd_sell_rate", 0] }, // Check if ngn_usd_sell_rate is 0
              then: "$keble_sell_rate", // Use keble_sell_rate if it's 0
              else: "$ngn_usd_sell_rate", // Use ngn_usd_sell_rate if it's not 0
            }
          },
          eur_usd_buy_rate: 1,
          eur_usd_sell_rate: 1,
          gbp_usd_buy_rate: 1,
          gbp_usd_sell_rate: 1,
          cad_usd_buy_rate: 1,
          cad_usd_sell_rate: 1,
          is_default: 1,
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
        },
      },
    ];

    const exchange_rates = await this.findAggregate(exchange_rate_pipeline);

    // Return exchange_rates information
    return exchange_rates;
  }
}

// Export exchangeRateRepository
export default new ExchangeRateRepository();
