import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { SettlementAccount } from '../models';
import { ExpressRequest } from '../server';
import { repoPagination, repoSearch, repoTime } from '../util';
import { ISettlementAccountDocument } from '../interfaces/settlement-account.interface';


class SettlementAccountRepository {
  // Function to create Settlement Account
  public async createSettlementAccount({
    account_number,
    routing_number,
    account_type,
    swift_code,
    recipient_info,
    bank_info,
    special_instructions,
    created_by,
  }: {
    account_number: number;
    routing_number: number;
    account_type: string;
    swift_code: string;
    recipient_info: string;
    bank_info: string;
    special_instructions: string;
    created_by?: Types.ObjectId;
  }): Promise<ISettlementAccountDocument | null | any> {
    const data = { account_number, routing_number, account_type, swift_code, recipient_info, bank_info, special_instructions, created_by };

    return await SettlementAccount.create(data);
  }

  // Function to update Settlement Account by _id
  public async atomicUpdate(
    query: FilterQuery<ISettlementAccountDocument>,
    record: UpdateQuery<ISettlementAccountDocument>,
    ): Promise<ISettlementAccountDocument | null> {
    return SettlementAccount.findOneAndUpdate(
      query, record, {
        new: true,
    });
  }

  // Function to delete Settlement Account by _id
  public async delete(query: FilterQuery<ISettlementAccountDocument>): Promise<ISettlementAccountDocument | null> {
    return SettlementAccount.findByIdAndDelete(query);
  }

  // Update default Settlement Account based on record object parameters passed
  public async batchUpdate(record: any): Promise<ISettlementAccountDocument[] | null | any> {
    return SettlementAccount.updateMany({ is_active: true }, { ...record }, { new: true });
  }

  // Get Settlement Account based on query object parameters passed
  public async getOne(
    query: FilterQuery<ISettlementAccountDocument>,
    populate: string = ""
  ): Promise<ISettlementAccountDocument | null> {
      return SettlementAccount.findOne(query).populate(populate).lean(true);
  }

  // Function to get all Settlement Account (Admin)
  public async findSettlementAccountAdmin(req: ExpressRequest): Promise<ISettlementAccountDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const perpage = Number(query.perpage) || 10; // Set the number of records to return
    const page = Number(query.page) || 1; // Set the page number
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the amountFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the amountTo

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter to the filter object
    const filter = { ...timeFilter };

    // Get the testimonials and total documents from the database
    const [accounts, total] = await Promise.all([
      SettlementAccount.find(filter)
        .lean(true)
        .sort({ createdAt: -1 })
        .limit(perpage)
        .skip(page * perpage - perpage),
        SettlementAccount.aggregate([
        { $match: filter },
        { $count: 'count' },
      ]),
    ]);

    const pagination = repoPagination({ page, perpage, total: total[0]?.count! });

    // Return data and pagination information
    return { accounts, pagination };
  }

  // This function finds an aggregate of a given query
  // and returns an array of ISettlementAccountDocument objects or null
  public async findAggregate(query: any): Promise<ISettlementAccountDocument[] | null> {
    // Use the SettlementAccount model to aggregate the given query
    return SettlementAccount.aggregate(query);
  }

  // Get Settlement Accounts Document - no pagination
  public async findAccountsNoPagination({
    req,
  }: {
    req: ExpressRequest;
  }): Promise<ISettlementAccountDocument[] | null | any> {
    const { query } = req; // Get the query params from the request object
    const search = String(query.search); // Set the string for searching
    let period = String(query.period) || 'all'; // Set the period
    const dateFrom: any = query.dateFrom || 'Jan 1 2021'; // Set the dateFrom
    const dateTo: any = query.dateTo || `${Date()}`; // Set the dateTo

    // Check if there is a search string and add it to the search query object
    const searching = repoSearch({
      search: search,
      searchArray: [
        'account_number', 'routing_number', 'account_type',
      ],
    });

    // Check the period and set the time filter accordingly
    const timeFilter = await repoTime({ period, dateFrom, dateTo });

    // Add timeFilter, filterQuery to the filter object
    const filter = { ...timeFilter, ...searching };

    // Create pipeline for aggregate query
    const account_pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          account_number: 1,
          routing_number: 1,
          account_type: 1,
          swift_code: 1,
          recipient_info: 1,
          bank_info: 1,
          special_instructions: 1,
          is_active: 1,
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

    const accounts = await this.findAggregate(account_pipeline);

    // Return personalize messages information
    return accounts;
  }

}

// Export testimonialRepository
export default new SettlementAccountRepository();
